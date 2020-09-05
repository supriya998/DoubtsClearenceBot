var mongojs = require('mongojs');
var dbobject = mongojs('mongodb://supriya:santoshi@cluster0-shard-00-00-pgw1n.mongodb.net:27017,cluster0-shard-00-01-pgw1n.mongodb.net:27017,cluster0-shard-00-02-pgw1n.mongodb.net:27017/Doubt?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority',['details','ids','faculty'])
var request = require('request')
var fs = require('fs');

var findMessageType=function(msg,callbackfunc){
    if(msg.text=='/start'){
        callbackfunc('/start')
    }
    else if(msg.hasOwnProperty('photo')){
        callbackfunc('photo')
    }
    else if(msg.hasOwnProperty('document')){
        callbackfunc('document')
    }
    else if(msg.hasOwnProperty('video')){
        callbackfunc('video')
    }
    else{
        callbackfunc('text') //this error text block is executed
    }
}

var downloadFile = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
      //console.log('content-type:', res.headers['content-type']);
      //console.log('content-length:', res.headers['content-length']);
  
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};


var isRegisteredUser=function(fromid,callbackfunc){
    dbobject.ids.find({"chatid":fromid},function(error,docs){
        if(error){
          callbackfunc(error,null)
        }
        else if(docs.length == 0){
            callbackfunc(new Error('User is not registered'),null)
        }
        else{
            callbackfunc(null,docs)
        }
    })
}

var findUserType=function(info,callbackfunc){
    if(info.hasOwnProperty("name"))
        callbackfunc("faculty")
    else if(info.hasOwnProperty("regdno"))
        callbackfunc("student")
}

var findStudentId=function(regnos,callbackfunc){
    dbobject.ids.find({"regdno":regnos },function(err,docs){
        if(err){
            callbackfunc(err,null)
        }
        else{
            callbackfunc(null,docs)
        }
    })    
}

var findFacultyForStudent=function(regdno,callbackfunc){
    dbobject.details.find({"regdno":regdno},function(error,docs){
        if(error){
            callbackfunc(error,null)
        }
        else{
            callbackfunc(null,docs)
        }
    })
}

var findStudentsForFaculty=function(facultyid,callbackfunc){
    dbobject.details.find({"facultyid":facultyid},function(error,docs){
        //console.log(docs)
        if(error){
          callbackfunc(error,null)
        }
        else{
          var regnos=[];
          var i = 0;
          docs.forEach(function(element){
            var regno = element.regdno;
            regnos[i] = regno;
            i++;
          })
          callbackfunc(null,regnos)
        }
    })
}    

var findStudentIds=function(regnos,callbackfunc){
    dbobject.ids.find({"regdno":{$in:regnos} },function(err,docs){
        if(err){
            callbackfunc(err,null)
        }
        else{
            callbackfunc(null,docs)
        }
    })    
}

var sendTextToStudents=function(bot,docs,msg){
    var msg1 = msg.text;
    //console.log(msg1)
    var msg1 = msg1.slice(4,msg1.length);
    var str = "Your Faculty wrote:\n" + msg1;
    docs.forEach(function(element){
        var id = element.chatid;
        bot.sendMessage(id,str);//sending message to students
      })
}

var downloadPhotoFromMessage=function(msg,callbackfunc){
    var file_id
    //console.log("120:"+msg.photo.length)//check it.yes sir we have sent.but 120 is not printed naa.sir we got it like some three.
    if(msg.photo.length>1)//sent sir.
        file_id=msg.photo[1].file_id
    else
        file_id=msg.photo[0].file_id
    const url='https://api.telegram.org/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/getFile?file_id='+file_id
    request({ url: url,json:true }, function(error, response)  {
    if(error){
        callbackfunc(error,null)
    }
    else{
        //var data = response.body   
        console.log(response.body)
        var relurl=response.body.result.file_path
        console.log(relurl)
        var imgurl='https://api.telegram.org/file/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/'+relurl
        console.log(imgurl)
        downloadFile(imgurl, relurl, function(){
            callbackfunc(null,relurl)
        });
    }
  })
}

var sendPhotoToStudents=function(bot,docs,filepath){
    docs.forEach(function(element){
        var id = element.chatid;
        var str = "Your Faculty sent:\n";
        bot.sendMessage(id,str);
        bot.sendPhoto(id, './'+filepath);
      });
}

var sendPhotoToFaculty=function(bot,facultyid,reg,filepath){
    var str = reg + " sent:\n";
    bot.sendMessage(facultyid,str);
    bot.sendPhoto(facultyid, './'+filepath)
}

var downloadVideoFromMessage=function(msg,callbackfunc){
    var file_id=msg.video.file_id
    const url='https://api.telegram.org/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/getFile?file_id='+file_id
    request({ url: url,json:true }, function(error, response)  {
    if(error){
        callbackfunc(error,null)  
    }
    else{
        //var data = response.body   
        console.log(response.body)
        var ok = response.body.ok
        //console.log(ok)
        if(ok){
        var relurl=response.body.result.file_path
        //console.log(relurl)
        var imgurl='https://api.telegram.org/file/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/'+relurl
        //console.log(imgurl)
        downloadFile(imgurl, relurl, function(){
            callbackfunc(null,relurl)
        });
        }
        else{
            var des = response.body.description;
            //console.log(des)
            callbackfunc(null,des)
        }
    }
  })
}

var sendVideoToStudents=function(bot,docs,filepath){
    docs.forEach(function(element){
        var id = element.chatid;
        var str = "Your Faculty sent:\n";
        bot.sendMessage(id,str);
        bot.sendVideo(id, './'+filepath);
      });
}

var sendVideoToFaculty=function(bot,facultyid,reg,filepath){
    var str = reg + " sent:\n";
    bot.sendMessage(facultyid,str);
    bot.sendVideo(facultyid, './'+filepath)
}

var downloadDocumentFromMessage=function(msg,callbackfunc){
    var file_id=msg.document.file_id
    var filename = msg.document.file_name
    const url='https://api.telegram.org/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/getFile?file_id='+file_id
    request({ url: url,json:true }, function(error, response)  {
    if(error){
        callbackfunc(error,null)
    }
    else{
        //var data = response.body   
        //console.log(response.body)
        var ok = response.body.ok
        //console.log(ok)
        if(ok){
        var relurl=response.body.result.file_path
        var diskpath='./documents/'+filename
        diskpath=diskpath.replace(' ','_')
        //console.log(relurl)
        var imgurl='https://api.telegram.org/file/bot1251880329:AAEyPY-FHpAO6UR4SHPURc4zOJQISYIkkkQ/'+relurl
        //console.log(imgurl)
        downloadFile(imgurl, diskpath, function(){
            callbackfunc(null,diskpath)
        });
        }
        else{
            console.log("ok false")
            var des = response.body.description;
            //console.log(des)
            callbackfunc(null,des)
        }
    }
  })
}

var sendDocumentToStudents=function(bot,docs,filepath){
    docs.forEach(function(element){
        var id = element.chatid;
        var str = "Your Faculty sent:\n";
        bot.sendMessage(id,str);
        bot.sendDocument(id, filepath);
      });
}

var sendDocumentToFaculty=function(bot,facultyid,reg,filepath){
    var str = reg + " sent:\n";
    bot.sendMessage(facultyid,str);
    bot.sendDocument(facultyid, filepath);
}

module.exports.findStudentIds=findStudentIds;
module.exports.dbobject=dbobject;
module.exports.isRegisteredUser=isRegisteredUser;
module.exports.findMessageType=findMessageType;
module.exports.findUserType=findUserType;
module.exports.findFacultyForStudent=findFacultyForStudent;
module.exports.findStudentId=findStudentId;
module.exports.findStudentsForFaculty=findStudentsForFaculty;
module.exports.sendTextToStudents=sendTextToStudents;
module.exports.downloadPhotoFromMessage=downloadPhotoFromMessage;
module.exports.sendPhotoToStudents=sendPhotoToStudents;
module.exports.sendPhotoToFaculty=sendPhotoToFaculty;
module.exports.sendVideoToStudents=sendVideoToStudents;
module.exports.sendVideoToFaculty=sendVideoToFaculty;
module.exports.downloadVideoFromMessage=downloadVideoFromMessage;
module.exports.downloadDocumentFromMessage=downloadDocumentFromMessage;
module.exports.sendDocumentToStudents=sendDocumentToStudents;
module.exports.sendDocumentToFaculty=sendDocumentToFaculty;