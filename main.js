const express = require("express");
const PORT = process.env.PORT || 8080;


console.clear();
require("dotenv").config();
const {
	AccountId,
	PrivateKey,
	Client,
  AccountCreateTransaction,
	TokenType,
	TokenSupplyType,
	TokenMintTransaction,
	TransferTransaction,
	AccountBalanceQuery,
	TokenAssociateTransaction,
  Hbar,
	TokenCreateTransaction
} = require("@hashgraph/sdk");



const app = express();

//=====================================================Time and Cart Total Calculation ===========================================
app.use(
  express.urlencoded({
    extended: true,
  })
);app.use(express.json());

app.get("/", (req, res) => {
      res.send("Hedera Api")
});

//===========  Get Balance of tiny bar from an account

app.get("/balance", (req, res) => {
  var clientType = req.query.clientType
  let  newAccountId = req.query.accountId
  if(clientType == null || newAccountId == null){
    res.status(404).send("Missing Parameters")
  }

  let client;
  if(clientType == "Testnet"){
    client = Client.forTestnet();
  }else if(clientType == "Mainnet"){
    client = Client.forMainnet();
  }
  

   
    async function main() {
      //Check the new account's balance
        const getNewBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client);

        console.log("The account balance is: " +getNewBalance.hbars.toTinybars()/100000000 +" Hbar.")
        res.send({status:"success",balance:getNewBalance.hbars})
    }

    main().catch((err) => {
          console.log(err)
          res.status(504).send(err)
        });
});


app.post("/test", async (req, res) => {
    res.status(404).send("Not found")
});


//====================================================== Append  for Delivery==================================================
app.post("/", async (req, res) => {
    var action = req.body.action
    var clientType = req.body.clientType

    if(action == null || clientType == null){
      res.status(404).send("Action and ClientType must be provided")
    }
        if(action == "createaccount"){
          // Get account id from the req body
          // get the private key from header
          async function  createaccount() {

            //Grab your Hedera testnet account ID and private key from your .env file
            const myAccountId = req.body.accountId;
            const myPrivateKey = req.headers.private_key;
            
            // If we weren't able to grab it, we should throw a new error
            if (myAccountId == null ||
                myPrivateKey == null ) {
                  res.status(404).send("Variables accountId and Private Key must be present")
            }
        
            // create our connection to the Hedera network
            // The Hedera JS SDK makes this really easy!
            let client;
            if(clientType == "Testnet"){
              client = Client.forTestnet();
            }else if(clientType == "Mainnet"){
              client = Client.forMainnet();
            }
            
        
            client.setOperator(myAccountId, myPrivateKey);
        
            //Create new keys
            const newAccountPrivateKey = await PrivateKey.generateED25519(); 
            const newAccountPublicKey = newAccountPrivateKey.publicKey;
        
            //Create a new account with 1,000 tinybar starting balance
            const newAccount = await new AccountCreateTransaction()
                .setKey(newAccountPublicKey)
                .setInitialBalance(Hbar.fromTinybars(1000))
                .execute(client);
        
            // Get the new account ID
            const getReceipt = await newAccount.getReceipt(client);
            const newAccountId = getReceipt.accountId;

        
            console.log("The new account ID is: " +newAccountId);
        
            //Verify the account balance
            const accountBalance = await new AccountBalanceQuery()
                .setAccountId(newAccountId)
                .execute(client);
        
         console.log("The new account balance is: " +accountBalance.hbars.toTinybars() +" tinybar.");
        res.send({status:"success",accountId:"0.0."+newAccountId.num.low,data:newAccountId})
        }
        createaccount().catch((err) => {
          console.log(err)
          res.status(504).send(err)
        });
        

    }else if(action == "createnft"){
      let tokenName = req.body.tokenName;
      let tokenSymbol = req.body.tokenSymbol;
      let decimal = req.body.decimal;
      let initialSupply = req.body.initialSupply;
      let maxSupply = req.body.maxSupply;

      
      if(tokenName == null || tokenSymbol == null ||decimal == null || initialSupply == null || maxSupply == null ||  req.body.accountId == null || req.headers.private_key == null || req.body.treasuryId == null || req.headers.treasury_key == null){
        res.status(504).send("Missing Parameters")
      }
      

      const operatorId = AccountId.fromString(req.body.accountId);
      const operatorKey = PrivateKey.fromString(req.headers.private_key);
      const treasuryId = AccountId.fromString(req.body.treasuryId);
      const treasuryKey = PrivateKey.fromString(req.headers.treasury_key);
        
      let client;
      if(clientType == "Testnet"){
        client = Client.forTestnet().setOperator(operatorId, operatorKey);
      }else if(clientType == "Mainnet"){
        client = Client.forMainnet().setOperator(operatorId, operatorKey);
      }

      const supplyKey = PrivateKey.generate();
      
      
      async function createnft() {
      //Create the NFT
      let nftCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(decimal)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(treasuryId)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(maxSupply)
      .setSupplyKey(supplyKey)
      .freezeWith(client);
      
      //Sign the transaction with the treasury key
      let nftCreateTxSign = await nftCreate.sign(treasuryKey);
      
      //Submit the transaction to a Hedera network
      let nftCreateSubmit = await nftCreateTxSign.execute(client);
      
      //Get the transaction receipt
      let nftCreateRx = await nftCreateSubmit.getReceipt(client);
      
      //Get the token ID
      let tokenId = nftCreateRx.tokenId;
      
      console.log(`- Created NFT with Token ID: ${tokenId} \n`);
      
      
      CID = ["QmTzWcVfk88JRqjTpVwHzBeULRTNzHY7mnBSG42CpwHmPa"];
      
      // Mint new NFT
      let mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([Buffer.from(CID)])
      .freezeWith(client);
      
      //Sign the transaction with the supply key
      let mintTxSign = await mintTx.sign(supplyKey);
      
      //Submit the transaction to a Hedera network
      let mintTxSubmit = await mintTxSign.execute(client);
      
      //Get the transaction receipt
      let mintRx = await mintTxSubmit.getReceipt(client);
      
      //Log the serial number
      console.log(`- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`);
      console.log({tokenId:"0.0."+tokenId['num']['low'],data:tokenId,serial:mintRx.serials[0].low})

      res.send({tokenId:"0.0."+tokenId['num']['low'],data:tokenId,serial:mintRx.serials[0].low})

      
      }
    createnft().catch((err) => {
      console.log(err)
      res.status(504).send(err)
    });
    }else if(action == "associatenft"){
      const tokenId = req.body.tokenId
      if(tokenId == null || req.body.accountId == null || req.headers.private_key == null || req.body.associateId == null || req.headers.associate_key == null){
        res.status(504).send("Missing Parameters")
      }
           // Configure accounts and client, and generate needed keys
        const operatorId = AccountId.fromString(req.body.accountId);
        const operatorKey = PrivateKey.fromString(req.headers.private_key);
      
        const aliceId = AccountId.fromString(req.body.associateId);
        const aliceKey = PrivateKey.fromString(req.headers.associate_key);

        let client;
        if(clientType == "Testnet"){
          client = Client.forTestnet().setOperator(operatorId, operatorKey);
        }else if(clientType == "Mainnet"){
          client = Client.forMainnet().setOperator(operatorId, operatorKey);
        }
        

        async function associatenft() {
        //Create the associate transaction and sign with Alice's key 
        let associateAliceTx = await new TokenAssociateTransaction()
          .setAccountId(aliceId)
          .setTokenIds([tokenId])
          .freezeWith(client)
          .sign(aliceKey);

        //Submit the transaction to a Hedera network
        let associateAliceTxSubmit = await associateAliceTx.execute(client);

        //Get the transaction receipt
        let associateAliceRx = await associateAliceTxSubmit.getReceipt(client);

        //Confirm the transaction was successful
        console.log(`- NFT association with Alice's account: ${associateAliceRx.status}\n`);
        console.log({Status:true, data:associateAliceRx.status,associatedAccountId: aliceId})
        res.send({Status:true,associatedAccountId: req.body.associateId,data:aliceId})

        }
      associatenft().catch((err) => {
        console.log(err)
        res.status(504).send(err)
      });
  }else if(action == "transfernft"){
    if(req.body.accountId == null || req.headers.private_key == null || req.body.treasuryId == null || req.headers.treasury_key == null){
      res.status(504).send("Missing Parameters")
    }
    const operatorId = AccountId.fromString(req.body.accountId);
    const operatorKey = PrivateKey.fromString(req.headers.private_key);
    const treasuryId = AccountId.fromString(req.body.treasuryId);
    const treasuryKey = PrivateKey.fromString(req.headers.treasury_key);
    const aliceId = AccountId.fromString(req.body.receiverId);

    let client;
    if(clientType == "Testnet"){
      client = Client.forTestnet().setOperator(operatorId, operatorKey);
    }else if(clientType == "Mainnet"){
      client = Client.forMainnet().setOperator(operatorId, operatorKey);
    }
    

    const tokenId = req.body.tokenId
        async function transfernft() {
          let tokenTransferTx = await new TransferTransaction()
          .addNftTransfer(tokenId, 1, treasuryId, aliceId)
          .freezeWith(client)
          .sign(treasuryKey);
      
      let tokenTransferSubmit = await tokenTransferTx.execute(client);
      let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
      
      console.log(`\n- NFT transfer from Treasury to Alice: ${tokenTransferRx.status} \n`);
      
      // Check the balance of the treasury account after the transfer
      var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
      console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);
      
      // Check the balance of Alice's account after the transfer
      var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
      console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} NFTs of ID ${tokenId}`);
      console.log({nftCount:1, data:balanceCheckTx.tokens._map.get(tokenId.toString()), nftId:tokenId})
      res.send({nftCount:1, data:balanceCheckTx.tokens._map.get(tokenId.toString()), nftId:tokenId})
      }
    transfernft().catch((err) => {
      console.log(err)
      res.status(504).send(err)
    });
  }else if(action == "transferhbar"){
        
    async function transferhbar() {

        //Grab your Hedera testnet account ID and private key from your .env file
        const myAccountId = req.body.accountId;
        const myPrivateKey = req.headers.private_key;
        const amount = req.body.amount;
        const newAccountId = req.body.receiverId;


        // If we weren't able to grab it, we should throw a new error
    if(amount == null || myPrivateKey == null || myAccountId == null || newAccountId == null){
      res.status(504).send("Missing Parameters")
    }

        // Create our connection to the Hedera network
        // The Hedera JS SDK makes this really easy!
        let client;
        if(clientType == "Testnet"){
          client = Client.forTestnet();
        }else if(clientType == "Mainnet"){
          client = Client.forMainnet();
        }
        

        client.setOperator(myAccountId, myPrivateKey);

  
        // Create a transaction to transfer 100 hbars
        const sendHbar = await new TransferTransaction()
            .addHbarTransfer(myAccountId, Hbar.fromTinybars(-amount))
            .addHbarTransfer(newAccountId, Hbar.fromTinybars(amount))
            .execute(client);

            const transactionReceipt = await sendHbar.getReceipt(client);
            console.log("The transfer transaction from my account to the new account was: " + transactionReceipt.status.toString());


            const queryCost = await new AccountBalanceQuery()
            .setAccountId(newAccountId)
            .getCost(client);

          
            //Check the new account's balance
            const getNewBalance = await new AccountBalanceQuery()
                .setAccountId(myAccountId)
                .execute(client);
        
            console.log("The account balance after the transfer is: " +getNewBalance.hbars.toTinybars())
            console.log("The cost of query is: " +queryCost);
            console.log(queryCost)
          console.log({status:true, queryCost:queryCost,balanceLeft:getNewBalance.hbars.toTinybars()})
          res.send({amountSent:req.body.amount,receiver:req.body.accountId,status:true, queryCost:queryCost,balanceLeft:getNewBalance.hbars.toTinybars()['low'],data:getNewBalance.hbars.toTinybars()})
      }
      
      transferhbar().catch((err) => {
        console.log(err)
        res.status(504).send(err)
      });
  }else if(action == "createft"){
    let tokenName = req.body.tokenName;
    let tokenSymbol = req.body.tokenSymbol;
    let decimal = req.body.decimal;
    let initialSupply = req.body.initialSupply;


    if(tokenName == null || tokenSymbol == null || decimal == null || req.body.accountId == null || req.headers.private_key == null || req.body.treasuryId == null || req.headers.treasury_key == null){
      res.status(504).send("Missing Parameters")
    }
      const operatorId = AccountId.fromString(req.body.accountId);
      const operatorKey = PrivateKey.fromString(req.headers.private_key);
      const treasuryId = AccountId.fromString(req.body.treasuryId);
      const treasuryKey = PrivateKey.fromString(req.headers.treasury_key);
      
      let client;
      if(clientType == "Testnet"){
        client = Client.forTestnet().setOperator(operatorId, operatorKey);
      }else if(clientType == "Mainnet"){
        client = Client.forMainnet().setOperator(operatorId, operatorKey);
      }
      
      const supplyKey = PrivateKey.generate();


      async function createft() {
            // CREATE FUNGIBLE TOKEN (STABLECOIN)
              let tokenCreateTx = await new TokenCreateTransaction()
              .setTokenName(tokenName)
              .setTokenSymbol(tokenSymbol)
              .setTokenType(TokenType.FungibleCommon)
              .setDecimals(decimal)
              .setInitialSupply(initialSupply)
              .setTreasuryAccountId(treasuryId)
              .setSupplyType(TokenSupplyType.Infinite)
              .setSupplyKey(supplyKey)
              .freezeWith(client);


              //SIGN WITH TREASURY KEY
              let tokenCreateSign = await tokenCreateTx.sign(treasuryKey);

              //SUBMIT THE TRANSACTION
              let tokenCreateSubmit = await tokenCreateSign.execute(client);

              //GET THE TRANSACTION RECEIPT
              let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

              //GET THE TOKEN ID
              let tokenId = tokenCreateRx.tokenId;

              //LOG THE TOKEN ID TO THE CONSOLE
              console.log(`- Created token with ID: ${tokenId} \n`);
          console.log({status:true,data:tokenId})
          res.send({status:true,tokenId:"0.0."+tokenId['num']['low'],data:tokenId})

      }
      createft().catch((err) => {
        console.log(err)
        res.status(504).send(err)
      });
  }else if(action == "associateft"){
    // Configure accounts and client, and generate needed keys
    const tokenId = req.body.tokenId
    if(tokenId == null || req.body.accountId == null || req.headers.private_key == null || req.body.associateId == null || req.headers.associate_key == null){
      res.status(504).send("Missing Parameters")
    }

    const operatorId = AccountId.fromString(req.body.accountId);
    const operatorKey = PrivateKey.fromString(req.headers.private_key);
    const aliceId = AccountId.fromString(req.body.associateId);
    const aliceKey = PrivateKey.fromString(req.headers.associate_key);
    
    let client;
    if(clientType == "Testnet"){
      client = Client.forTestnet().setOperator(operatorId, operatorKey);
    }else if(clientType == "Mainnet"){
      client = Client.forMainnet().setOperator(operatorId, operatorKey);
    }
    
    const supplyKey = PrivateKey.generate();
 
  async function associateft() {
    // TOKEN ASSOCIATION WITH ALICE's ACCOUNT
      let associateAliceTx = await new TokenAssociateTransaction()
      .setAccountId(aliceId)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(aliceKey);

      //SUBMIT THE TRANSACTION
      let associateAliceTxSubmit = await associateAliceTx.execute(client);

      //GET THE RECEIPT OF THE TRANSACTION
      let associateAliceRx = await associateAliceTxSubmit.getReceipt(client);

      //LOG THE TRANSACTION STATUS
      console.log(`- Token association with Alice's account: ${associateAliceRx.status} \n`);
      console.log({status:true,data:associateAliceRx.status})
      res.send({status:true,data:associateAliceRx.status,associateId:req.body.associateId})


  }
  associateft().catch((err) => {
    console.log(err)
    res.status(504).send(err)
  });
  }else if(action =="transferft"){
    const amount = req.body.amount;
    const tokenId = req.body.tokenId

    if(amount == null || req.body.receiverId == null || tokenId == null || req.body.accountId == null || req.headers.private_key == null || req.body.treasuryId == null || req.headers.treasury_key == null){
      res.status(504).send("Missing Parameters")
    }
          // Configure accounts and client, and generate needed keys
          const operatorId = AccountId.fromString(req.body.accountId);
          const operatorKey = PrivateKey.fromString(req.headers.private_key);
          const treasuryId = AccountId.fromString(req.body.treasuryId);
          const treasuryKey = PrivateKey.fromString(req.headers.treasury_key);
          const aliceId = AccountId.fromString(req.body.receiverId);
       
          let client;
          if(clientType == "Testnet"){
            client = Client.forTestnet().setOperator(operatorId, operatorKey);
          }else if(clientType == "Mainnet"){
            client = Client.forMainnet().setOperator(operatorId, operatorKey);
          }
          
          

          async function transferft() {
              //BALANCE CHECK
                  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
                  console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
                  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
                  console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

                  // TRANSFER STABLECOIN FROM TREASURY TO ALICE
                  let tokenTransferTx = await new TransferTransaction()
                      .addTokenTransfer(tokenId, treasuryId, -amount)
                      .addTokenTransfer(tokenId, aliceId, amount)
                      .freezeWith(client)
                      .sign(treasuryKey);

                  //SUBMIT THE TRANSACTION
                  let tokenTransferSubmit = await tokenTransferTx.execute(client);

                  //GET THE RECEIPT OF THE TRANSACTION
                  let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

                  //LOG THE TRANSACTION STATUS
                  console.log(`\n- Stablecoin transfer from Treasury to Alice: ${tokenTransferRx.status} \n`);

                  // BALANCE CHECK
                  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(treasuryId).execute(client);
                  console.log(`- Treasury balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
                  let myData = balanceCheckTx.tokens._map.get(tokenId.toString())
                  console.log(myData)
                  var balanceCheckTx = await new AccountBalanceQuery().setAccountId(aliceId).execute(client);
                  console.log(`- Alice's balance: ${balanceCheckTx.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
                  console.log({status:true,yourBalance:myData['low'],receiverBalance:balanceCheckTx.tokens._map.get(tokenId.toString())['low'],data:myData,tokenId:tokenId})
                  res.send({status:true,yourBalance:myData['low'],receiverBalance:balanceCheckTx.tokens._map.get(tokenId.toString())['low'],data:myData,tokenId:tokenId})
          }       
        transferft().catch((err) => {
          console.log(err)
          res.status(504).send(err)
        });
  }
});

app.listen(PORT, () => {
  console.log(`Server is up and running at ${PORT}`);
});
