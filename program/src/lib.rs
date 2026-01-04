use solana_program::{
    account_info::{ AccountInfo, next_account_info },
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::invoke_signed,
    rent::Rent,
    system_instruction,
    msg,
    sysvar::Sysvar,
};

use borsh::{ BorshDeserialize, BorshSerialize };

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct CreateEscrowInstruction {
    pub repo_hash: [u8; 32],
    pub issue_number: u64,
    pub amount: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct ReleaseEscrowInstruction {
    pub repo_hash: [u8; 32],
    pub issue_number: u64,
}

//this is how the escrow data is store on chain
#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct EscrowAccount {
    pub is_initialized: bool,
    pub repo_hash: [u8; 32],
    pub issue_number: u64,
    pub amount: u64,
}

impl EscrowAccount {
    pub const LEN: usize = 1 + 32 + 8 + 8; // 49 bytes
}

pub const ESCROW_SEED: &[u8] = b"escrow";

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    // first byte - use for catching which function to use
    let (option, rest) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match option {
        0 => {
            msg!("Instruction: CreateEscrow");
            let instruction = CreateEscrowInstruction::try_from_slice(rest).map_err(
                |_| ProgramError::InvalidInstructionData
            )?;
            //calling create escrow handler from here
            // msg!("Repo hash: {:?}", instruction.repo_hash);
            // msg!("Issue: {}, Amount: {}", instruction.issue_number, instruction.amount);
            create_escrow(program_id, accounts, instruction)
        }
        1 => {
            msg!("Instruction: ReleaseEscrow");
            let instruction = ReleaseEscrowInstruction::try_from_slice(rest).map_err(
                |_| ProgramError::InvalidInstructionData
            )?;
            //calling release escrow handler from here
            release_escrow(program_id, accounts, instruction)
            // msg!("Repo hash: {:?}", instruction.repo_hash);
            // msg!("Issue: {}", instruction.issue_number);
            // Ok(())
        }

        _ => {
            msg!("Error: Unknown instruction");
            Err(ProgramError::InvalidInstructionData)
        }
    }
    // Ok(())
}

pub fn create_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction: CreateEscrowInstruction
) -> ProgramResult {
    msg!("Processing: Creating Escrow");

    //parsing all accounts

    let iter = &mut accounts.iter();
    let payer = next_account_info(iter)?;
    let escrow_account = next_account_info(iter)?;
    let system_program = next_account_info(iter)?;

    if instruction.amount == 0 {
        msg!("Error: Amount can not be zero");
        return Err(ProgramError::InvalidArgument);
    }
    if !payer.is_signer {
        msg!("Error: Payer must be a signer");
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (pda, bump) = Pubkey::find_program_address(
        &[ESCROW_SEED, &instruction.repo_hash, &instruction.issue_number.to_le_bytes()],
        program_id
    );

    msg!("Expected PDA: {}", pda);
    msg!("Bump: {}", bump);
    msg!("Match: {}", pda == *escrow_account.key);
    msg!("================================");

    if pda != *escrow_account.key {
        msg!("Error: Invalid Escrow PDA");
        return Err(ProgramError::InvalidAccountData);
    }

    //check if the escrow has some lamports already

    if escrow_account.lamports() > 0 {
        msg!("Error: Escrow already exists");
    }

    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(EscrowAccount::LEN);

    msg!("Rent required: {}", rent_lamports);
    msg!("Bounty amount: {}", instruction.amount);

    let total_lamports = rent_lamports + instruction.amount;

    //creating account using cpi to system program
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            escrow_account.key,
            total_lamports,
            EscrowAccount::LEN as u64,
            program_id
        ),
        &[payer.clone(), escrow_account.clone(), system_program.clone()],
        &[&[ESCROW_SEED, &instruction.repo_hash, &instruction.issue_number.to_le_bytes(), &[bump]]]
    )?;

    //initialize escrow data
    let escrow_data = EscrowAccount {
        is_initialized: true,
        repo_hash: instruction.repo_hash,
        issue_number: instruction.issue_number,
        amount: instruction.amount,
    };

    // serialize and write to an account
    escrow_data.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;

    msg!("Escrow created successfully");
    msg!("Issue: {}, Amount: {} SOL", instruction.issue_number, instruction.amount);

    Ok(())
}

pub fn release_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction: ReleaseEscrowInstruction
) -> ProgramResult {
    msg!("Processing: Releasing Escrow");

    let iter = &mut accounts.iter();
    let escrow_account = next_account_info(iter)?;
    let recipient = next_account_info(iter)?;
    let authority = next_account_info(iter)?;

    if escrow_account.lamports() == 0 {
        msg!("Error: Escrow already released");
        return Err(ProgramError::InvalidAccountData);
    }
    //derving the pda
    let (pda, _bump) = Pubkey::find_program_address(
        &[ESCROW_SEED, &instruction.repo_hash, &instruction.issue_number.to_le_bytes()],
        program_id
    );

    if !authority.is_signer {
        msg!("Error: Authority must sign");
        return Err(ProgramError::MissingRequiredSignature);
    }
    //verify the escrow account is the correct PDA
    if pda != *escrow_account.key {
        msg!("Error: Invalid Escrow PDA");
        return Err(ProgramError::InvalidAccountData);
    }

    //verify that escrow account is owned by this program
    if program_id != escrow_account.owner {
        msg!("Error: Escrow account not owned by program");
        return Err(ProgramError::IncorrectProgramId);
    }

    // deserailize and verify escrow
    let escrow_data = EscrowAccount::try_from_slice(&escrow_account.data.borrow())?;

    //verify that escrow is initialized
    if !escrow_data.is_initialized {
        msg!("Error: Escrow not initialized");
        return Err(ProgramError::UninitializedAccount);
    }

    //verify that issue number matches
    if escrow_data.issue_number != instruction.issue_number {
        msg!("Error: Issue number is mismatched");
        return Err(ProgramError::InvalidAccountData);
    }

    //verify that repo hash matches
    if escrow_data.repo_hash != instruction.repo_hash {
        msg!("Error: Repo Hash is mismatched");
        return Err(ProgramError::InvalidAccountData);
    }

    msg!("Releasing {} lamports to recipient", escrow_data.amount);

    //transferring the bounty amount to the recipient
    **escrow_account.try_borrow_mut_lamports()? -= escrow_data.amount;
    **recipient.try_borrow_mut_lamports()? += escrow_data.amount;

    msg!("Bounty transferred Successfully");
    let remaining_lamports = escrow_account.lamports();

    **escrow_account.try_borrow_mut_lamports()? = 0;
    **authority.try_borrow_mut_lamports()? += remaining_lamports;

    msg!("Escrow account closed, rent returned to the authority");
    msg!(
        "Released {} SOL for issue #{}",
        (escrow_data.amount as f64) / 1_000_000_000.0,
        escrow_data.issue_number
    );

    Ok(())
}
