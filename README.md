  Some of the hosted repos/programs are here
  - https://www.npmjs.com/package/solana-bounty-sdk
  - Solana Program - visit https://explorer.solana.com/address/GrDTkJbiCU8F9nQE3aqBbNt3tFnH5RHPNMbFJ9j6Hhzy?cluster=devnet for more info

    
## Hey there

- It is a group of three repos from hackathon participation organized by decentra cloud and nova consortium
- You need to set up them individually




# bounty bot server ..

- do an npm install and npm run dev and you will have a running server.. ofc you need to put some env
  - variables in your .env file .. for that you can copy .env.example as .env and put in the required fields
  - Remember you need to create a github app and then install it on a specific repo while giving access for issue read/write and pr read write. and set up a webhook url while creating the github app which has sufficient permissions.
  - For more info please give the above statements to chatgpt it will help you out.

# program

- for that you need to have cargo and rustc in your system , refer the versions in cargo.toml file then you can run
  - "cargo build-sbf" and then you can find a .so file in target/deploy/ then you can run solana deploy from your solana cli to deploy it on anywhere whether it is devnet or mainnet or testnet.. upto you.
  - you need to have solana-cli locally in your machine for that

# solana-bounty-sdk

- you can find a deployed version on npm with the same name .. or you can refer to the README.md file of the same directory.
- if you want to manually deploy it .. you can do npm login in terminal and login to npm registry and then create a token with all the access permissions. and you need to configure that token
- npm config set //registry.npmjs.org/:\_authToken=<your_token> in your local machine
- now you can deploy it after building by npm publish command.
