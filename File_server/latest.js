const fs = require('fs-extra');
const csvtojson = require('csvtojson');
const path = require("path");
const http = require("http");


//path of csv file folder
Filepath = './telstra-csv';
filename = '';
Csvdocs = [];
Dbdocs = [];
Files = '';
Size=[];
firstcsv='';
lastcsv='';
//path of archive folder
ArchiveFilepath = './Archive-files';


// Reading csv files from directory: telstra-csv
fs.readdirAsync = function (dirname) {
  return new Promise(function (resolve, reject) {
    fs.readdir(dirname, function (err, filenames) {
      if (err)
        reject(err);
      else
        resolve(filenames);
    });
  });
};

// ------------Execution----------------


// read directory per file
// post content to db with http request
// read first and last json from csv files
// get 1st and last posted doc from db
// with promise chaining

fs.readdirAsync(Filepath)
  .then(function (files) {
    Files = files;
    return Promise.all(files.map(postContent))

  })
  .then((postedAll) => {
    console.log(postedAll);
    console.log(Size);
    firstcsv = Size[0];
    lastcsv = Size[Size.length - 1];
    return Promise.all(Files.map(movefile))

  })
  .then((movedToArchive) => {
    console.log(movedToArchive);
    return getdocsCsv()

  })
  .then((docsCsv) => {
    console.log("1st and last docs from csv files");
    console.log(docsCsv);
    return getdocdDb()

  }).then((docsDb) => {
    
    console.log("1st and last docs from Db :");
    console.log(docsDb);

    var modify = (Dbjson) => {

      Object.keys(Dbjson).forEach((key) => {
        if (key == "_id" || key == "__v") {
          delete Dbjson[key]
        }
      })


    }
    modify(Dbdocs[0]);
    modify(Dbdocs[1])


    //check
    if ((JSON.stringify(Csvdocs) == (JSON.stringify(Dbdocs)))) {
      console.log("successfully posted and verified the contents to Database");
    }

  }).catch((e) => console.log(e))




//Posting content of each json in csv to database
var postContent = async (file) => {
  filename = '';
  var jsonArray = await csvtojson().fromStream(fs.createReadStream(path.join(__dirname, `${Filepath}`, `${file}`)));
  return new Promise((resolve, reject) => {
    
    Size.push(`${file}`);

    filename = file.split('.')[0];
    filename = (filename == 'product' || filename == 'service') ? ('service') : (filename == 'personaldata') ? ('personaldata') : ('data');;

   

      options = {
        host: 'localhost',
        port: 3000,
        path: `/${filename}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }

      var postreq = http.request(options, (res) => {

        res.setEncoding('utf8');
        console.log(res.statusCode);
        console.log(`${file}`);
        res.on('data', (chunk) => {
          resolve(`posted content of ${file}`);
        })

        res.on('error', (e) => {
          reject(e);
        })

      })

      postreq.write(JSON.stringify(jsonArray));
      postreq.on('error', (e) => { reject(e) });
      postreq.end();


  })

}


//mobing files to Archive
function movefile(file) {
  return new Promise((resolve, reject) => {
    fs.move(path.join(__dirname, `${Filepath}`, `${file}`), path.join(__dirname, `${ArchiveFilepath}`, `/${file}`), (err) => {
      if (err) {
        console.log(`Error in moving ${file} to archive`);
        reject(console.error(err))
      }
      resolve((`${file} moved to Archive`));
    })
  })

}

//getting first and last doc from csv files
function getdocsCsv() {
  return new Promise((resolve, reject) => {
    
    getfromcsv(resolve,reject);
    
  })

}


// getting jsons from db
function getdocdDb() {
  return new Promise((resolve, reject) => {
   
    get_Dbcalls(resolve, reject);
   
  })
}




var getfromcsv = async (resolve,reject) => {
  try{
  var jsonArray = await csvtojson().fromFile(path.join(__dirname, `${ArchiveFilepath}`, `${firstcsv}`));
  Csvdocs.push(jsonArray[0]);

  jsonArray = await csvtojson().fromFile(path.join(__dirname, `${ArchiveFilepath}`, `${lastcsv}`));
  Csvdocs.push(jsonArray[jsonArray.length - 1]);
  resolve(Csvdocs);

  }
 catch(e){
   reject(e)
 }
  
}

var get_Dbcalls = async (resolve,reject) => {
 
  firstcsv = firstcsv.split(".")[0];
  lastcsv = lastcsv.split(".")[0];

  firstcsv = (firstcsv == 'product' || firstcsv == 'service') ? ('service') : (firstcsv == 'personaldata') ? ('personaldata') : ('data');
  lastcsv = (lastcsv == 'product' || lastcsv == 'service') ? ('service') : (lastcsv == 'personaldata') ? ('personaldata') : ('data');


  optionsfirst = {
    host: 'localhost',
    port: 3000,
    path: `/${firstcsv}/getfirstdoc`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  http.get(optionsfirst, (res) => {
    console.log(res.statusCode);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
     
      Dbdocs.splice(0, 0, JSON.parse(chunk))
    })
    res.on('error',(e)=>{
      reject(e);
    })
  }).end();

  optionslast = {
    host: 'localhost',
    port: 3000,
    path: `/${lastcsv}/getlastdoc`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  http.get(optionslast, (res) => {
    console.log(res.statusCode);
    res.setEncoding('utf8')
    res.on('data', (chunk) => {
     
      Dbdocs.splice(1, 0, JSON.parse(chunk)[0])

      resolve(Dbdocs);
    })

    res.on('error',(e)=>{
      reject(e);
    })
  }).end();

}


