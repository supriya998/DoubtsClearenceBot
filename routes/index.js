process.env.NTBA_FIX_319=1
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../utils/database.js');
var csv = require('csvtojson');
var mongojs = require('mongojs');
var request = require('request');
var fs = require('fs');
var TelegramBot = require('node-telegram-bot-api');
const { S_IFDIR } = require('constants');
const { start } = require('repl');
const { isNullOrUndefined } = require('util');
var token = '1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ';
var bot = new TelegramBot(token, {polling: true,onlyFirstMatch: true});
var rollno;

router.get('/', function(req, res, next) {
  res.render('uploadform', {  });
});

router.get('/uploadform',function(req,res,next){
  res.render('uploadform', {  });
})

router.get('/uploadformforfaculty',function(req,res,next){
  res.render('uploadformforfaculty', {  });
});

router.post('/upload',function(req,res,next) {
  var file = req.files.inputfile
  uploadedpath = path.join(__dirname,'../upload/',file.name)
  file.mv(uploadedpath,function(error) {
    if(error) {
      res.render('uploadstatus',{msg:"File upload error"})
    }
    else {
      csv()
      .fromFile(uploadedpath)  // promise operation
      .then(function(jsonarray) {
        var bulk = db.dbobject.details.initializeOrderedBulkOp()
        var count = 0;
        jsonarray.forEach(function(element) {
          bulk.insert(element)
          count = count + 1;
        })
        bulk.execute(function(error) {
          if(error) {
            console.log(error)
          }
          else {
            res.render('uploadstatus',{msg:count+" CSV data loaded Successfully."})
          }
        })
      })
    }
  })
})

router.post('/uploadforfaculty',function(req,res,next) {
  var file = req.files.inputfile
  uploadedpath = path.join(__dirname,'../upload/',file.name)
  file.mv(uploadedpath,function(error) {
    if(error) {
      res.render('uploadstatus',{msg:"File upload error"})
    }
    else {
      csv()
      .fromFile(uploadedpath)  // promise operation
      .then(function(jsonarray) {
        var bulk = db.dbobject.faculty.initializeOrderedBulkOp()
        var count = 0;
        jsonarray.forEach(function(element) {
          bulk.insert(element)
          count = count + 1;
        })
        bulk.execute(function(error) {
          if(error) {
            console.log(error)
          }
          else {
            res.render('uploadstatus',{msg:count+" CSV data loaded Successfully."})
          }
        })
      })
    }
  })
})



router.get('/download1',function(req,res,next) {
  res.download(path.join(__dirname,'../public/','details.csv'),'counsellersmapping.csv')
})

router.get('/download2',function(req,res,next) {
  res.download(path.join(__dirname,'../public/','faculty.csv'),'faculty.csv')
})


bot.on('message',function(msg){
  //console.log("100")
  console.log(msg)
  db.findMessageType(msg,function(type){
    if(type=='/start'){
      var chatid = msg.chat.id;
      var str = "If you are a Student enter the command Student/<<student_regdno>>\nIf you are a Faculty enter the command Faculty/<<faculty_id>>\nFor example:Student/17B01A1201 or Faculty/1202\n\n\n If you are faculty and want send message to students\n\nFor Individual send as ex:-1201-Your message\n\nFor all the students as ex:-All-Your message\n\nFor LE as ex:-5A01-Your message\n\nFor sending documents,images and videos faculty must write regd nos as caption.\n\nNote:-No two students can communicate you can only send your doubts to faculty."
      bot.sendMessage(chatid,str);
    }
    else if(type == "text"){
      var fromid = msg.chat.id;
      var jsonrow={'chatid': fromid}
      db.isRegisteredUser(fromid,function(error,docs){
        if(error){
          console.log(error)
        }
        else{
          var info = docs[0];
          db.findUserType(info,function(userType){
            if(userType=='faculty'){
              var rno = msg.text.split('-')[0];
              var patt1 = /[0-9]{2}[a-z|A-Z|0-9]{2}$/;
              var patt2 = /[All|all]$/;
              var patt3 = /^5[A|a][0-9]{2}/;
              var result1 = rno.match(patt2);
              var result = rno.match(patt1);
              var result2 = rno.match(patt3);
              if(result){
                var rno = "18B01A"+rno;
                db.findStudentId(rno,function(error,docs){
                  //console.log(docs+"130")
                  if(error){
                    console.log(error)
                  }
                  else if(docs.length == 0){
                    bot.sendMessage(fromid,"User is not yet registered.")
                  }
                  else{
                    var sendid = docs[0].chatid;
                    var msg1 = msg.text;
                    //console.log(msg1)
                    var msg1 = msg1.slice(5,msg1.length);
                    var str = "Your faculty wrote:-\n"+msg1;
                    bot.sendMessage(sendid,str);
                  }
                })
              }
              else if(result2){
                var rrno = rno.slice(2,);
                var rno = "19B05A12"+rrno;
                db.findStudentId(rno,function(error,docs){
                  //console.log(docs)
                  if(error){
                    console.log(error)
                  }
                  else if(docs.length == 0){
                    bot.sendMessage(fromid,"User is not yet registered.")
                  }
                  else{
                    var sendid = docs[0].chatid;
                    var msg1 = msg.text;
                    //console.log(msg1)
                    var msg1 = msg1.slice(7,msg1.length);
                    var str = "Your faculty wrote:-\n"+msg1;
                    bot.sendMessage(sendid,str);
                  }
                })
              }
              else if(result1){
                db.findStudentsForFaculty(fromid,function(error,regnos){
                  if(error){
                    console.log(error)
                  }
                  else{
                    //console.log(regnos);
                    db.findStudentIds(regnos,function(error,docs){
                      console.log(docs)
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(msg.chat.id,"None of your students are registered.You can start sending messages if atleast one of them are registered.")
                      }
                      else{
                        //console.log(msg);
                        db.sendTextToStudents(bot,docs,msg)
                      }
                    })
                  }
                })
              }
              else{
                bot.sendMessage(fromid,"Please Enter Student's RegdNo before entering text message.")
              }
            }
            else if(userType = 'student'){
              var reg = info.regdno;
              db.findFacultyForStudent(reg,function(error,docs){
                //console.log(docs)
                //console.log(docs[0].hasOwnProperty('facultyid'))
                if(error){
                  console.log(error)
                }
                else if(docs[0].hasOwnProperty('facultyid') == false){
                  bot.sendMessage(msg.chat.id,"Your faculty is not registered.You can able to communicate with him,Once your faculty got registered")
                }
                else{
                  var rno1 = docs[0].regdno;
                  //console.log(rno1);
                  var msg1 = rno1+" Sent:-\n"+msg.text;
                  //console.log(msg1);
                  bot.sendMessage(docs[0].facultyid,msg1);
                }
              })
            }
          });
        }
      })
    }
    else if(type=='photo'){
      console.log("Photo")
      var fromid = msg.chat.id;
      var jsonrow={'chatid': fromid}
      db.isRegisteredUser(fromid,function(error,docs){
        if(error){
          console.log(error)
        }
        else{
          var info = docs[0];
          db.findUserType(info,function(userType){
            if(userType=='faculty'){
              db.findStudentsForFaculty(fromid,function(error,regnos){
                if(error){
                  console.log(error)
                }
                else{
                  console.log(msg);
                  //console.log(regnos);
                  var rno = rollno;
                  console.log(rno);
                  var patt1 = /[0-9]{2}[a-z|A-Z|0-9]{2}$/;
                  var patt2 = /[All|all]$/;
                  var patt3 = /^5[A|a][0-9]{2}/;
                  var result1 = rno.match(patt2);
                  var result = rno.match(patt1);
                  var result2 = rno.match(patt3);
                  if(result){
                    var rno = "18B01A"+rno;
                    db.findStudentId(rno,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      }
                      else{
                          db.downloadPhotoFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else{
                              db.sendPhotoToStudents(bot,docs,filepath)
                            }
                          })
                      }
                    })
                  }
                  else if(result1){        
                    db.findStudentIds(regnos,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(msg.chat.id,"None of your students are registered.You can start sending messages if atleast one of them are registered.")
                      }
                      else{
                          db.downloadPhotoFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else{
                              db.sendPhotoToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })
                  }
                  else if(result2){
                    var rrno = rno.slice(2,);
                    var rno = "19B05A12"+rrno;
                    db.findStudentId(rno,function(error,docs){
                      //console.log(docs)
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      } 
                      else{
                        db.downloadPhotoFromMessage(msg,function(error,filepath){
                          if(error){
                            console.log(error)
                          }
                          else{
                            db.sendPhotoToStudents(bot,docs,filepath)
                          }
                        })
                      }
                   })
                 }
                 else{
                  bot.sendMessage(fromid,"Please Enter Student's RegdNo in caption.")
                 }
               }
              })
            }
            else if(userType=='student'){
              var reg = info.regdno;
              db.findFacultyForStudent(reg,function(error,docs){
                if(error){
                  console.log(error)
                }
                else if(docs[0].hasOwnProperty('facultyid') == false){
                  bot.sendMessage(msg.chat.id,"Your faculty is not registered.You can able to communicate with him,Once your faculty got registered")
                }
                else{
                  console.log("242"); 
                  db.downloadPhotoFromMessage(msg,function(error,filepath){
                    //console.log(filepath+"\n"+"244")
                    if(error){
                      console.log(error)
                    }
                    else{
                      db.sendPhotoToFaculty(bot,docs[0].facultyid,reg,filepath)
                    }
                  })
                }
              })
            }
          })
        }
      })  
    }
    else if(type=='video'){
      console.log(msg)
      var fromid = msg.chat.id;
      var jsonrow={'chatid': fromid}
      db.isRegisteredUser(fromid,function(error,docs){
        if(error){
          console.log(error)
        }
        else{
          var info = docs[0];
          db.findUserType(info,function(userType){
            if(userType=='faculty'){
              db.findStudentsForFaculty(fromid,function(error,regnos){
                if(error){
                  console.log(error)
                }
                else{
                  //console.log(regnos);
                  var rno = rollno;
                  var patt1 = /[0-9]{2}[a-z|A-Z|0-9]{2}$/;
                  var patt2 = /[All|all]$/;
                  var patt3 = /^5[A|a][0-9]{2}/;
                  var result1 = rno.match(patt2);
                  var result = rno.match(patt1);
                  var result2 = rno.match(patt3);
                  if(result){
                    var rno = "18B01A"+rno
                    db.findStudentId(rno,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      }
                      else{
                          db.downloadVideoFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendVideoToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })
                  }
                  else if(result1){
                    db.findStudentIds(regnos,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(msg.chat.id,"None of your students are registered.You can start sending messages if atleast one of them are registered.")
                      }
                      else{
                          db.downloadVideoFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendVideoToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })  
                  }
                  else if(result2){
                    var rrno = rno.slice(2,);
                    var rno = "19B05A12"+rrno;
                    db.findStudentId(rno,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      }
                      else{
                          db.downloadVideoFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendVideoToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })
                  }
                }
              })
            }
            else if(userType=='student'){
              var reg = info.regdno;
              db.findFacultyForStudent(reg,function(error,docs){
                if(error){
                  console.log(error)
                }
                else if(docs[0].hasOwnProperty('facultyid') == false){
                  bot.sendMessage(msg.chat.id,"Your faculty is not registered.You can able to communicate with him,Once your faculty got registered")
                }
                else{
                  db.downloadVideoFromMessage(msg,function(error,filepath){
                    if(error){
                      console.log(error)
                    }
                    else if(filepath == "Bad Request: file is too big"){
                      //chatmessage.sendTextToFaculty(bot,docs[0].facultyid,reg,msg)
                      bot.sendMessage(msg.chat.id,filepath);
                    }
                    else{
                      db.sendVideoToFaculty(bot,docs[0].facultyid,reg,filepath)
                    }
                  })
                }
              })
            }
          })
        }
      })  
    }
    else if(type=='document'){
      console.log(msg)
      var fromid = msg.chat.id;
      var jsonrow={'chatid': fromid}
      db.isRegisteredUser(fromid,function(error,docs){
        if(error){
          console.log(error)
        }
        else{
          var info = docs[0];
          db.findUserType(info,function(userType){
            if(userType=='faculty'){
              db.findStudentsForFaculty(fromid,function(error,regnos){
                if(error){
                  console.log(error)
                }
                else{
                  //console.log(regnos);
                  var rno = rollno;
                  var patt1 = /[0-9]{2}[a-z|A-Z|0-9]{2}$/;
                  var patt2 = /[All|all]$/;
                  var patt3 = /^5[A|a][0-9]{2}/;
                  var result1 = rno.match(patt2);
                  var result = rno.match(patt1);
                  var result2 = rno.match(patt3);
                  if(result){
                    var rno = "18B01A"+rno
                    db.findStudentId(rno,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      }
                      else{
                          db.downloadDocumentFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendDocumentToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })
                  }
                  else if(result1){
                    db.findStudentIds(regnos,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(msg.chat.id,"None of your students are registered.You can start sending messages if atleast one of them are registered.")
                      }
                      else{
                          db.downloadDocumentFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendDocumentToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })  
                  }
                  else if(result2){
                    var rrno = rno.slice(2,);
                    var rno = "19B05A12"+rrno;
                    db.findStudentId(rno,function(error,docs){
                      if(error){
                        console.log(error)
                      }
                      else if(docs.length == 0){
                        bot.sendMessage(fromid,"User is not yet registered.")
                      }
                      else{
                          db.downloadDocumentFromMessage(msg,function(error,filepath){
                            if(error){
                              console.log(error)
                            }
                            else if(filepath == "Bad Request: file is too big"){
                              //chatmessage.sendTextToStudents(bot,docs,msg)
                              bot.sendMessage(msg.chat.id,filepath);
                            }
                            else{
                              db.sendDocumentToStudents(bot,docs,filepath)
                            }
                          })
                        }
                    })
                  }
                }
              })
            }
            else if(userType=='student'){
              var reg = info.regdno;
              db.findFacultyForStudent(reg,function(error,docs){
                if(error){
                  console.log(error)
                }
                else if(docs[0].hasOwnProperty('facultyid') == false){
                  bot.sendMessage(msg.chat.id,"Your faculty is not registered.You can able to communicate with him,Once your faculty got registered")
                }
                else{
                  db.downloadDocumentFromMessage(msg,function(error,filepath){
                    if(error){
                      console.log(error)
                    }
                    else if(filepath == "Bad Request: file is too big"){
                      //chatmessage.sendTextToFaculty(bot,docs[0].facultyid,reg,msg)
                      bot.sendMessage(msg.chat.id,filepath);
                    }
                    else{
                      db.sendDocumentToFaculty(bot,docs[0].facultyid,reg,filepath)
                    }
                  })
                }
              })
            }
          })
        }
      })  
    }
  })
})


bot.onText(/Faculty\/[0-9]{4}$/,function(msg){
  var fromid = msg.chat.id;
  var facultyid=msg.text.split('/')[1]
  var jsonrow={'chatid': fromid, 'name': facultyid}
      db.dbobject.ids.find({"name":facultyid}, function (err, docs) {
        if(docs.length == 0){
          db.dbobject.ids.insert(jsonrow,function(err,newD){
            //console.log("Faculty Data is inserted");
          });
          db.dbobject.faculty.find({"name":facultyid},function(err,docs) {
            if(docs.length == 0) {
              bot.sendMessage(fromid,"Sorry,No students are assigned for you..")
            }
            else {
              db.dbobject.details.updateMany({"name":facultyid},{$set:{'facultyid':fromid}},function(err,newD){
                //console.log("Faculty ID's are updated for students.");
              });
              db.dbobject.faculty.update({"name":facultyid},{$set:{'facultyid':fromid}},function(err,newD){
                //console.log("Faculty Data updated.");
              });
              bot.sendMessage(fromid,"Now, you can send messages to your students.")
            }
          })
        }
        else{
          bot.sendMessage(fromid,facultyid+' is re-registered');
        }
      })
})

bot.onText(/^[D|d]oc*/,function(msg){
  var fromid = msg.chat.id;
  rollno = msg.text.split('-')[1]; 
  bot.sendMessage(fromid,"Registration number is considering now try sending Document.")
})

bot.onText(/^[V|v]id*/,function(msg){
  var fromid = msg.chat.id;
  rollno = msg.text.split('-')[1];
  bot.sendMessage(fromid,"Registration number is considering now try sending Video.")
})

bot.onText(/^[I|i]mg*/,function(msg){
  var fromid = msg.chat.id;
  rollno = msg.text.split('-')[1];
  bot.sendMessage(fromid,"Registration number is considering now try sending Image.")
})

//student registration -1
bot.onText(/Student\/[0-9]{2}[a-z|A-Z|0-9]{4}[a-z|A-Z|0-9]{4}$/,function(msg){
  var fromid = msg.chat.id;
  console.log(fromid)
  var studregdno=msg.text.split('/')[1].toUpperCase()
  var jsonrow={'chatid': fromid , 'regdno': studregdno}
      db.dbobject.ids.find({"regdno":studregdno}, function (err, docs) {
        if(docs.length == 0){
          db.dbobject.ids.insert(jsonrow,function(err,newD){
            //console.log("Student Data is inserted");
          });
        }
        else{
          db.dbobject.ids.update({"regdno":studregdno},{$set:{'chatid':fromid}},function(err,newD){
            bot.sendMessage(fromid,studregdno+' is re-registered');
          })
        }
        bot.sendMessage(fromid,"Now, you can send messages to your faculty..")
      })
//bot.sendMessage(fromid, "Select to whom you want to talk", {"reply_markup": {"keyboard": [["ALL", "Students","Faculty","Allfaculty"]]}});
});

module.exports = router;