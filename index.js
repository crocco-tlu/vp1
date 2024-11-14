const express = require("express");
const dtEt = require("./dateTimeEt");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
//päringu lahtiharutamiseks POST päringute puhul
const bodyparser = require("body-parser");
//failide üleslaadimiseks
const multer = require("multer");
//pildi manipuleerimiseks
const sharp = require("sharp")
const bcrypt = require("bcrypt");
//sessioonihaldur
const session = require("express-session");

const app = express();
app.use(session({secret: "PaumoSaladused", saveUninitialized: true, resave: true}))
app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu URL-i parsimine, false kui ainult tekst, true, kui muud ka
app.use(bodyparser.urlencoded({extended: true}));
//seadistame vahevara 'multer' fotode laadimiseks kindlasse kataloogi
const upload = multer({dest: "./public/gallery/orig/"})

//loon andmebaasiühenduse
const conn = mysql.createConnection({
  host: dbInfo.configData.host,
  user: dbInfo.configData.user,
  password: dbInfo.configData.passWord,
  database: dbInfo.configData.dataBase
});

const checkLogin = function(req, res, next) {
  if(req.session != null) {
    if(req.session.userId) {
      console.log("Login, sees kasutaja: " + req.session.userId);
      next();
    }
    else {
      console.log("login not detected");
      res.redirect("/signin");
    }
  }
  else {
    console.log("session not detected");
    res.redirect("/signin");
  }
}

app.get("/", (req, res)=>{
	//res.send("Express läks täiesti käima!");
  res.render("index", {time: dtEt.semesterTimeNow()});
});

app.get("/signin", (req, res)=>{
	res.render("signin");
});

app.post("/signin", (req, res)=>{
	let notice = "";
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log("Andmeid puudu");
		notice = "Sisselogimise andmeid on puudu!";
		res.render("signin",{notice: notice});
	}
	else {
		let sqlReq = "SELECT id, password FROM vp_users WHERE email = ?";
		conn.execute(sqlReq, [req.body.emailInput], (err, result)=>{
			if(err){
				console.log("Viga andmebaasist lugemisel!" + err);
				notice = "Tehniline viga, sisselogimine ebaõnnestus!";
				res.render("signin",{notice: notice});
			}
			else {
				if(result[0] != null){
					//kasutaja on olemas, kontrollime sisestatud parooli
					bcrypt.compare(req.body.passwordInput, result[0].password, (err, compareresult)=>{
						if(err){
							notice = "Tehniline viga, sisselogimine ebaõnnestus!";
							res.render("signin",{notice: notice});
						}
						else {
							//kas õige või vale parool
							if(compareresult){
								//notice = "Oled sisse loginud!";
                //res.render("signin",{notice: notice});
                req.session.userId = result[0].id;
								res.redirect("/home");
							}
							else {
								notice = "Kasutajatunnus ja/või parool on vale!";
								res.render("signin",{notice: notice});
							}
						}
					});
				}
				else {
					notice = "Kasutajatunnus ja/või parool on vale!";
					res.render("signin",{notice: notice});
				}
			}
		});//conn.execute lõppeb
	}
	//res.render("index",{days: dtEt.daysBetween("9-2-2024")});
});

app.get("/home", checkLogin, (req, res)=>{
  console.log("Sees on kasutaja: " + req.session.userId);
	res.render("home");
});

app.get("/logout", (req, res)=>{
  req.session.destroy();
  console.log("Kasutaja välja logitud!");
  res.redirect("/");
});

app.get("/signup", (req, res)=>{
	res.render("signup");
});

app.post("/signup", (req, res)=>{
	let notice = "Ootan andmeid!";
	console.log(req.body);
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput || req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log("Andmeid on puudu või paroolid ei kattu!");
		notice = "Andmeid on puudu, parool liiga lühike või paroolid ei kattu!";
		res.render("signup", {notice: notice});
	}//kui andmetes viga ... lõppeb
	else {
		notice = "Andmed sisestatud!";
		//loome parooli räsi jaoks "soola"
		bcrypt.genSalt(10, (err, salt)=> {
			if(err){
				notice = "Tehniline viga, kasutajat ei loodud";
				res.render("signup", {notice: notice});
			}
			else {
				//krüpteerime
				bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
					if(err){
						notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud";
						res.render("signup", {notice: notice});
					}
					else {
						let sqlReq = "INSERT INTO vp_users (first_name, last_name, birth_date, gender, email, password) VALUES(?,?,?,?,?,?)";
						conn.execute(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], (err, result)=>{
							if(err){
								notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud.";
								res.render("signup", {notice: notice});
							}
							else {
								notice = "Kasutaja " + req.body.emailInput + " edukalt loodud!";
								res.render("signup", {notice: notice});
							}
						});//conn.execute lõpp
					}
				});//hash lõppeb
			}
		});//genSalt lõppeb
	}//kui andmed korrs, lõppeb
	//res.render("signup");
});

app.get("/timenow", (req, res)=>{
	const weekdayNow = dtEt.weekDay();
	const dateNow = dtEt.dateFormatted();
	const timeNow = dtEt.timeFormatted();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});
});

app.get("/vanasonad", (req, res)=>{
	let folkWisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=>{
		if(err){
			//throw err;
			res.render("justlist", {h2: "Vanasõnad", listData: ["Ei leidnud ühtegi vanasõna!"]});
		}
		else {
			folkWisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkWisdom});
		}
	});
});

app.get("/regvisit", (req, res)=>{
	res.render("regvisit");
});

app.post("/regvisit", (req, res)=>{
	console.log(req.body);
	fs.open("public/textfiles/visitlog.txt", "a", (err, file)=>{
		if(err){
			throw err;
		}
		else {
			fs.appendFile("public/textfiles/visitlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ";", (err)=>{
				if(err){
					throw err;
				}
				else {
					console.log("Faili kirjutati!");
					res.render("regvisit");
				}
			});
		}
	});
});

app.get("/regvisitdb", (req, res)=>{
  let notice = "";
  let firstName = "";
  let lastName = "";
	res.render("regvisit", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{
  let notice = "";
  let firstName = "";
  let lastName = "";
  if(!req.body.firstNameInput || !req.body.lastNameInput) {
    firstName = firstNameInput
    lastName = lastNameInput
    notice = "Osa andmeid sisestamata"
    res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
  }
  else {
    let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES(?,?)";
    conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err, sqlres) => {
      if (err) {
        throw err
      }
      else {
        notice = "Külastus registreeritud"
        res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
      }
    });
  }
});

app.get("/eestifilm", (req, res)=>{
	res.render("filmindex");
});

app.get("/eestifilm/tegelased", (req, res)=>{
  let sqlReq = "SELECT first_name, last_name, birth_date FROM person"
  let persons = []
  conn.query(sqlReq, (err, sqlres) => {
    if (err) {
      throw err
    }
    else {
      console.log(sqlres);
      //persons = sqlres
      for (let i = 0; i < sqlres.length; i++){
        let person = {
          first_name: sqlres[i].first_name,
          last_name: sqlres[i].last_name,
          birth_date: dtEt.givenDateFormatted(sqlres[i].birth_date),
        };
        persons.push(person);
      }
      console.log(persons)
      res.render("tegelased", {persons: persons});
    }
  });
});

app.get("/addnews", (req, res)=>{
  let notice = "";
  let news_title = "";
  let news_text = "";
  let news_date = "";
  let expire_date = "";
	res.render("addnews", {notice: notice, news_title: news_title, news_text: news_text, news_date: news_date, expire_date: expire_date});
});

app.post("/addnews", (req, res)=>{
  let notice = "";
  let news_title = "";
  let news_text = "";
  let expire_date = "";
  const user_id = 1;
  if (!req.body.titleInput || !req.body.newsInput) {
    news_title = titleInput
    news_text = newsInput
    notice = "Palun täida kõik väljad.";
    res.render("addnews", {notice: notice, news_title: news_title, news_text: news_text, expire_date: expire_date, user_id: user_id});
  }
  else {
    let sqlreq = "INSERT INTO news (news_title, news_text, expire_date, user_id) VALUES(?,?,?,?)";
    if (!req.body.expireInput) {
      const today = new Date();
      let tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(today.getDate() + 10);
      expire_date = tenDaysFromNow.toISOString().split('T')[0]; // Format to YYYY-MM-DD
    }
    else {
      expire_date = req.body.expireInput;
    }
    conn.query(sqlreq, [req.body.titleInput, req.body.newsInput, expire_date, user_id], (err, sqlres) => {
      if (err) {
        console.log(expire_date)
        throw err
      }
      else {
        notice = "Uudis lisatud"
        res.render("addnews", {notice: notice, news_title: news_title, news_text: news_text, expire_date: expire_date});
      }
    });
  }
});

app.get("/photoupload", (req, res)=> {
  res.render("photoupload");
});

app.post("/photoupload", upload.single("photoInput"), (req, res)=> {
  console.log(req.body)
  console.log(req.file)
  //genereerime oma failinime ja nimetame üleslaetud faili ümber
  const fileName = "vp_" + Date.now() + ".jpg"
  fs.rename(req.file.path, req.file.destination + fileName, (err)=> {
    console.log(err);
  });
  sharp(req.file.destination + fileName).resize(800, 600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName)
  sharp(req.file.destination + fileName).resize(100, 100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName)
  let sqlReq = "INSERT INTO vp_photos (file_name, orig_name, alt_text, privacy, user_id) VALUES(?,?,?,?,?)";
  const userId = 1
  console.log("See on su console.log:", fileName, fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId)
  conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
    if(err) {
      throw err
    }
    else {
      res.render("photoupload");
    }
  });
});

app.get("/gallery", (req, res)=>{
	let sqlReq = "SELECT file_name, alt_text FROM vp_photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC";
	const privacy = 3;
	let photoList = [];
	conn.query(sqlReq, [privacy], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			for(let i = 0; i < result.length; i ++) {
				photoList.push({href: "/gallery/thumb/" + result[i].file_name, alt: result[i].alt_text});
			}
			res.render("gallery", {listData: photoList});
		}
	});
	//res.render("gallery");
});


app.listen(5120);
