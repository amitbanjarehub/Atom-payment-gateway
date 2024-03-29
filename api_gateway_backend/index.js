var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var crypto = require('crypto');
var unirest = require("unirest");

const req_enc_key = 'A4476C2062FFA58980DC8F79EB6A799E';
const req_salt = 'A4476C2062FFA58980DC8F79EB6A799E';
const res_dec_key = '75AEF0FA1B94B3C10D4F5B268F757F11';
const res_salt = '75AEF0FA1B94B3C10D4F5B268F757F11';

const merchId = "8952";//merchantId 
const merchPass = "Test@123";
const prodId = "NSE";
const Authurl = "https://caller.atomtech.in/ots/aipay/auth";

const algorithm = 'aes-256-cbc';
const password = Buffer.from(req_enc_key, 'utf8');
const salt = Buffer.from(req_salt, 'utf8');
const respassword = Buffer.from(res_dec_key, 'utf8');
const ressalt = Buffer.from(res_salt, 'utf8');
const iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 'utf8');

const encrypt = (text) => {
	var derivedKey = crypto.pbkdf2Sync(password, salt, 65536, 32, 'sha512');
	const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return `${encrypted.toString('hex')}`;
};

const decrypt = (text) => {
	const encryptedText = Buffer.from(text, 'hex');
	var derivedKey = crypto.pbkdf2Sync(respassword, ressalt, 65536, 32, 'sha512');
	const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
};

app.get('/',function(req,resp){
	let txnId = 'Invoice'+(new Date()).getTime().toString(36);
	let txnDate = "2021-09-01 20:46:00";
	let amount = "10";
	let userEmailId = "sagar.gopale@atomtech.in";
	let userContactNo = "8888888888";

	const jsondata = '{"payInstrument":{"headDetails":{"version":"OTSv1.1","api":"AUTH","platform":"FLASH"},"merchDetails":{"merchId":"'+merchId+'","userId":"","password":"'+merchPass+'","merchTxnId":"'+txnId+'","merchTxnDate":"'+txnDate+'"},"payDetails":{"amount":"'+amount+'","product":"'+prodId+'","custAccNo":"213232323","txnCurrency":"INR"},"custDetails":{"custEmail":"'+userEmailId+'","custMobile":"'+userContactNo+'"},  "extras": {"udf1":"udf1","udf2":"udf2","udf3":"udf3","udf4":"udf4","udf5":"udf5"}}}';
   

	const JSONString=jsondata.toString();
    let encDataR = encrypt(JSONString); 
	var req = unirest("POST", Authurl); // change url in case of production
	req.headers({
	"cache-control": "no-cache",
	"content-type": "application/x-www-form-urlencoded"
	});

	req.form({
	"encData": encDataR,
	"merchId": merchId
	});

     req.end(function (res) {
     if (res.error) throw new Error(res.error);
				let datas = res.body;
				// console.log(datas);
				var arr = datas.split("&").map(function (val, index) {
					return val;
				});
				var arrTwo = arr[1].split("=").map(function (val, index) {
					return val;
				});
				var decrypted_data = decrypt(arrTwo[1]);
				let jsonData = JSON.parse(decrypted_data);
				let respArray = Object.keys(jsonData).map(key => jsonData[key]);
				if(respArray[1]['txnStatusCode'] === 'OTS0000'){
					app.use(express.static(__dirname + '/'));
					app.use(bodyParser.urlencoded({extend:true}));
					app.engine('html', require('ejs').renderFile);
					app.set('view engine', 'html');
					app.set('views', __dirname);
					console.log("token:respArray[0]:===========>>", respArray[0])
					console.log("txnId:===========>>",txnId)
					console.log("merchId:===========>>",merchId)
                    resp.render('index.html',{token:respArray[0], txnId: txnId, merchId: merchId});
				}	
      });
});

// do not remove this line
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
	extended: true
}));

app.post('/Response', function (req, resp) {
	console.log("req:=====>>",req)
	console.log("resp:=====>>",resp)
	console.log("req.body:=====>>",req.body)
	console.log(",resp.body:=====>>",resp.body)

	var decrypted_data = decrypt(req.body.encData);
	let jsonData = JSON.parse(decrypted_data);
	let respArray = Object.keys(jsonData).map(key => jsonData[key]);
	console.log('Transaction status = ' + respArray[0]['responseDetails']['message']);
	console.log('Transaction Id = ' + respArray[0]['merchDetails']['merchTxnId']);
	console.log('Transaction Date = ' + respArray[0]['merchDetails']['merchTxnDate']);
	console.log('Transaction Bank Txn Id = ' + respArray[0]['payModeSpecificData']['bankDetails']['bankTxnId']);
	console.log(respArray);
	resp.json(respArray);
});

app.listen(3011, function () {
	console.log("Express server listening on port 3011");
});
