const express = require("express");
const app = express();
//app.use(require("flash")()); // use flash to flash error
const bcrypt = require("bcrypt");
const saltRounds = 10;

const session = require('express-session');
const cookieParser = require('cookie-parser');
const _ = require("lodash"); // library helps delivering modularity, performance & extras.
const bodyParser = require("body-parser"); // to get req.body

// configure the port number and tell the server to listen on that port
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs"); // set templating engine to ejs
app.use(bodyParser.urlencoded({extended: true})); // use extended v of body parser
app.use(express.static("public")); // tell the express app to use the public folder as public
app.use(cookieParser());
app.use(session({secret: "whydowefallsecretsymbole"}));


var message = "";

// SQL Database connectivity;
const mysql = require("mysql");
const db_config = {
  host: "us-cdbr-iron-east-05.cleardb.net",
  user: "b6e59b9e154e17",
  password: "7c2ade43",
  database: "heroku_bfb3f26938270da"
};
var db;
function handleDisconnect() {
  db = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  db.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      // console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }
    else {
      console.log('MySQL Connected.');
    }                                 // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  db.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}
handleDisconnect(); // call the handleDisconnect function once


app.get("/apology/:message", function(req, res) {

  res.send("Oops: " + req.params.message.split("_").join(" "));
  // TODO 1.GO BACK 2.good looking apology
});



app.get("/", function(req, res) {
    // console.log(req.session);
    if ("userId" in req.session) {

      let sql = "SELECT *, DATE(created_at) as date_created_at FROM efforts_wise WHERE user_id = ? AND DATE(created_at) = DATE(now()) ORDER BY hour DESC, created_at DESC;";

      let query = db.query(sql, [req.session.userId], (err, results) => {
        if (err) {
          console.log(err)
        }
        else {

          db.query(
            `
              SELECT dates.Date as Date, COUNT(DISTINCT hour) as hours
              FROM ( 
                  select a.Date 
                  from (
                      select curdate() - INTERVAL (a.a + (10 * b.a) + (100 * c.a) + (1000 * d.a) ) DAY as Date
                      from (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as a
                      cross join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as b
                      cross join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as c
                      cross join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as d
                  ) a
                  where a.Date between CURDATE() - INTERVAL 14 DAY AND CURDATE()
              ) dates
              LEFT JOIN (SELECT * FROM efforts_wise WHERE user_id = ?) as effortsW
              ON DATE(created_at) = dates.Date 
              GROUP BY dates.Date;
            `, [req.session.userId], (err, results2) => {
                if (err) {
                  console.log(err);
                } else {
                  console.log(results2);
                  res.render("dashboard", {efforts: results2, wiseListItems: results, navHighlight: "wise"});
                } 
              }
            );
          
          
        }

      });


    }
    else {
      res.redirect("/user-login");
    }


});
app.post("/", function(req, res) {

  // assume only one thing for now
  console.log("Hour: " + req.body.hour)

  var post = {user_id: req.session.userId, hour: req.body.hour, description: req.body.wiseItem, category: req.body.wiseCategory};

  var str = "" + req.body.wiseItem; 
  var matches = str.match(/(\d+)-(\d+)/);  // num-num take the first(idx:1) number          
  if (matches) { 
    post.hour = matches[1];
  }

  var sql = "INSERT INTO efforts_wise SET ?";
  db.query(sql, post, function(err, results, fields) {
    if (err) {
      console.log(err);
    }
    else {
     // res.render('dashboard',{msg:"Added Successfully"});
      res.redirect("/");      
    }
  })

});


app.get("/healthy", function(req, res) {

  if ("userId" in req.session) {

    let sql = "SELECT *, DATE(created_at) as date_created_at FROM efforts_healthy_food WHERE user_id = ? AND DATE(created_at) = DATE(now()) ORDER BY hour DESC, created_at DESC;";

    let query = db.query(sql, [req.session.userId], (err, results) => {
      if (err) {
        console.log(err)
      }
      else {
        res.render("dashboard-healthy", {healthyFoodItems: results, navHighlight: "healthy"});
        // console.log(results);
      }

    });

  } else {
    res.redirect("/user-login");
  }
});
app.post("/healthy", function(req, res) {

  if ("userId" in req.session) {


      var post = {user_id: req.session.userId,
        hour: req.body.hour,
        description: req.body.healthyFoodItem,
        category: req.body.healthyFoodCategory};
      var sql = "INSERT INTO efforts_healthy_food SET ?";
      db.query(sql, post, function(err, results, fields) {
        if (err) {
          console.log(err);
        }
        else {
          res.redirect("/healthy");
        }
      });


  } else {
    res.redirect("/user-login");
  }
});


app.get("/wealthy", function(req, res) {

  if ("userId" in req.session) {

    let sql = "SELECT *, DATE(created_at) as date_created_at FROM efforts_wealthy_expense WHERE user_id = ? AND DATE(created_at) = DATE(now()) ORDER BY hour DESC, created_at DESC;";

    let query = db.query(sql, [req.session.userId], (err, results) => {
      if (err) {
        console.log(err)
      }
      else {
        res.render("dashboard-wealthy", {wealthyExpenseItems: results, navHighlight: "wealthy"});
        // console.log(results);
      }

    });

  } else {
    res.redirect("/user-login");
  }
});
app.post("/wealthy", function(req, res) {

  if ("userId" in req.session) {


      var post = {user_id: req.session.userId,
         hour: req.body.hour,
         description: req.body.wealthyExpenseItem,
         amount: req.body.amount,
         category: req.body.wealthyExpenseCategory
       };
      var sql = "INSERT INTO efforts_wealthy_expense SET ?";
      db.query(sql, post, function(err, results, fields) {
        if (err) {
          console.log(err);
        }
        else {
          res.redirect("/wealthy");
        }
      });


  } else {
    res.redirect("/user-login");
  }
});


app.get("/user-login", function(req, res) {
  res.render("user-login") // render the user-login.ejs page
});
app.post("/user-login", function(req, res) {

  if (!req.body.username || !req.body.password) {
    res.redirect("/apology/Invalid_Input")
  }

  var user = {
    username: req.body.username,
    password: req.body.password
  };

  db.query("SELECT * from users WHERE username=?", [user.username] ,function(err, rows) {
    if (err) {
      console.log(err);
      //return done(err);
    }
    else {

       if (rows.length == 1) {

          // successful username found
          // Load hash from your password DB.
          bcrypt.compare(user.password, rows[0].password, function(err, result) {
          // res == true
            if (result === true) {
              // means done with no error, return rows[0] TRUTHY, nextFnToExecute
              // console.log(`Welcome ${rows[0].username}`); // send back rows which means true

              req.session.userId = rows[0].id;
              // console.log(req.session);
              // console.log(typeof(req.session));
              // console.log("userId" in req.session);
              res.redirect("/");
            }
            else {
              // incorrect password
              res.redirect("/apology/Incorrect_Username_Or_Password")
            }
          });

        } else {

          // username not found
          res.redirect("/apology/Incorrect_Username_Or_Password")
      }
    }
  });



});


app.get('/logout', function(req, res){
   req.session.destroy(function(){
      console.log("user logged out.")
   });
   console.log(req.session);
   res.redirect('/user-login');
});


app.get("/user-register", function(req, res) {
  res.render("user-register")
});
app.post("/user-register", function(req, res) {

  if (req.body.password != req.body.passwordAgain) {
    res.redirect("/apology/Passwords_Do_Not_Match")
  } else {

    var newUser = {
      username: req.body.username,
      password: req.body.password,
      email: req.body.email
    };

    bcrypt.hash(newUser.password, saltRounds, function(err, hash) {
      if (err) {
        res.redirect("/apology/Error_After_Registering")
      } else {
        db.query("INSERT INTO users(username, password, email) VALUES(?, ?, ?)", [newUser.username, hash, newUser.email], function (error, results, fields) {
          if (error) {
            console.log(error);
            res.redirect("/apology/username_or_email_already_exists")
          }
          else {
            // console.log(results.insertId);
            req.session.userId = results.insertId;

            //console.log("Registration Successful")
            res.redirect("/");
          }
        });
      }
    })
  }

});
// TODO CLIENT SIDE REGEXP ON 1.USERNAME, 2.PASSWORD username->if already exists password->tooEasyToBruteForceEvenViaHash email->correctRegexp

app.get("/sacrifice", function(req, res) {
  res.send("<h1>It means Rise. (No Story Apart From Sacrifice)</h1>")
});

app.get("/play-sports", function(req, res) {
  res.render("play-sports", {navHighlight: "play-sports"});
});

app.post("/play-sports", function(req, res) {
  var post = {
    day: req.body.day,
    sport: req.body.sport
  };
 db.query("select e.e_id as e_id,e.day as event_date, s.name as sport, v.name as Venue, e.start_time as start_time, e.end_time as end_time from event e, venue v, sports as s where v.id = e.v_id and e.day = ? and s.id = e.s_id and s.name = ?", [post.day, post.sport], function (error, results, fields) {
   if (error) {
     console.log(error);
   }
   else {
     res.render("view_bookings",{navHighlight: "healthy",EventList: results});
   }
  });
});

app.get("/host-events", function(req, res) {
  res.render("host-events", {navHighlight:"host-events"});
});

app.get("/host-events/:sportsname", function(req, res) {
  var sportsname = req.params.sportsname;
  if (sportsname !== "") {
    db.query("SELECT id FROM sports WHERE name LIKE ?",  [sportsname], (error, results) => {
      if (error) {
        console.log(error);
      } else {
          if (results.length == 0) {
            console.log("No such sport present!");

          } else {
            //console.log(typeof(results));
            //console.log(results[0].id);
            db.query("SELECT sv.s_id AS s_id, v.id AS v_id, v.name AS v_name FROM venue v, sports_venue sv WHERE v.id = sv.v_id AND s_id = ?;", [results[0].id], (errorInner, resultsInner) => {
              if (errorInner) {
                console.log(errorInner)
              } else {
                res.render("host-sports-form", {rows: resultsInner, navHighlight: "host-events",});
              }
            })

          }


      }

    });
  }
});

app.post("/view_players", function(req, res)  {
  var post = {
    e_id: req.body.e_id,
  };
  db.query("select u.username as uname, u.email as uemail from plays p, users u where p.u_id = u.id and p.e_id = ?;", [post.e_id], function (error, results, fields) {
   if (error) {
     console.log(error);
   }
   else {
     console.log(results);
     res.render("view_players",{navHighlight: "healthy",EventList: results,eidd:post.e_id});
   }
  });
});

app.post("/add_player", function(req, res)  {
  var post = {
    e_id: req.body.e_id,
    u_id:req.session.userId
  };
  // console.log("final");
  // console.log(post.e_idd);

  // console.log(post.uid);

  var sql = "INSERT INTO plays SET ?";

  db.query(sql, post, function(err, results, fields) {
    if (err) {
      console.log(err);
    }
    else {
      res.redirect("/play-sports");
    }
  });

});


// app.get("/galattime/:sportsname", function(req, res) {
//   var sportsname = req.params.sportsname;
//   if (sportsname !== "") {
//     db.query("SELECT id FROM sports WHERE name LIKE ?",  [sportsname], (error, results) => {
//       if (error) {
//         console.log(error);
//       } else {
//           if (results.length == 0) {
//             console.log("No such sport present!");
//           } else {
//             //console.log(typeof(results));
//             //console.log(results[0].id);
//             db.query("SELECT sv.s_id AS s_id, v.id AS v_id, v.name AS v_name FROM venue v, sports_venue sv WHERE v.id = sv.v_id AND s_id = ?;", [results[0].id], (errorInner, resultsInner) => {
//               if (errorInner) {
//                 console.log(errorInner)
//               } else {
//                 res.render("host-sports-form", {rows: resultsInner, navHighlight: "host-events"});
//               }
//             })

//           }


//       }

//     });
//   }
// });

app.post("/host-events/", function(req, res) {
  var sportsname = req.params.sportsname;
  if (sportsname !== "") {
      var newEvent = 
      {  s_id: req.body.s_id,
         v_id: req.body.v_id,
         start_time: req.body.start_time,
         end_time: req.body.end_time,
         day: req.body.day,
       };
       if(req.body.start_time > req.body.end_time)
       {
           console.log("Start time cannot be greater than end");
           res.redirect("/host-events/",{msg:"Start time cannot be greater than end"})
           //res.redirect("/galattime/");
           //toastr.info('');
        }
       else
       {
        cursor=db.query("select * from event where v_id=? and day =? and end_time >?",[newEvent.v_id,newEvent.day,newEvent.start_time],function (error, results, fields) {
          if (error) {
            console.log(error);
            
            //res.redirect("/apology/username_or_email_already_exists")
          } else if (cursor.length != 0) {
            console.log("You cannot play");
            res.redirect("/host-events/")
          }
          else {
               res.redirect("/host-events/");
          }
        });
       
        var sql = "INSERT INTO event SET ?";
         db.query(sql, newEvent, function(err, results, fields) {
           if (err) {
             console.log(err);

           }
           else {
             res.redirect("/host-events/");
           }
          });

       }
    }
});



//Now is my part

app.get("/upload-videos", function(req, res) {
  res.render("posts-upload",{navHighlight: "posts_upload"});
});

app.post("/upload-videos", function(req, res) {
  if ("userId" in req.session) {
    var post = {user_id: req.session.userId,
       video_url: req.body.video_url,
       description: req.body.description,
     };
    db.query("INSERT INTO posts(user_id,post_text,video_url) VALUES(?,?,?)",[post.user_id,post.description,post.video_url], function(err, results, fields) {
      if (err) {
        console.log(err);
      }
      else {
        res.redirect("/upload-videos");
      }
    });

  } 
  else {
    res.redirect("/");
}

});


//Now we have view posts button

app.get("/community", function(req, res) {
  //if ("userId" in req.session) 
  {

    let sql = "SELECT video_url,post_text from posts";

    let query = db.query(sql, [req.session.userId], (err, results) => {
      if (err) {
        console.log(err);
      }
      else {
        res.render("view-posts",{navHighlight: "posts_upload",all_urls:results,add:"\"" });
      }
    });
  } //else {
   // res.redirect("/user-login");
  //}
});

app.post("/community", function(req, res) {
  //Lets assume we have got the comment and the like button ka data
  console.log("hello");
});

app.get("/video-lessons", function(req, res) {
  //if ("userId" in req.session) 
  res.render("video_lessons",{navHighlight: "posts_upload"});

});

app.get("/podcasts", function(req, res) {
  //if ("userId" in req.session) 
  res.render("podcast",{navHighlight: "posts_upload"});

});

//sports news

app.get("/sports-news", function(req, res) {
  //if ("userId" in req.session) 
  res.render("sportsnews",{navHighlight: "posts_upload"});

});





app.get("/amzn", function(req, res) {
  let sql = "SELECT *, DATE(created_at) as date_created_at FROM efforts_wise WHERE user_id = ? AND DATE(created_at) = DATE(now()) ORDER BY hour DESC, created_at DESC;";

  let query = db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      console.log(err)
    }
    else {
      res.render("amzn", {cursor: results, navHighlight: "wise"});
      // console.log(results);
    }
  })
});

app.listen(PORT, function() {
  console.log(`Server started on port ${PORT}`)
});
