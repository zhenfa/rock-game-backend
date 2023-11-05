var express = require('express');
var app = express();
let cors = require('cors');
var server = require('http').Server(app);
var io = require('socket.io')(server, {
  cors: {
    origin: `*`,
    methods: ['GET', 'POST']
  }
});
var uuid = require('uuid');

/** 上線名單 */
let users = [];
 
server.listen(3001);
 
/** API 測試 */
app.use(cors());

app.get('/users', function (req, res) {
  res.status(200).json(users);
});

// app.get('/users/:id', function(req, res){

// })

/** User Model 
 * 使用者狀態模型
*/
let userModel = {
   id: '',
   username: '',
   type:0
}

io.on('connection', function (socket) {

  console.log('a user is connected, id:', socket.id);

  /** 連線測試 */
  socket.on('wsTest', function (data) {
    
    console.log('okok');
  });

  /** 上線通知 */
  socket.on('online', function (data) {
    let { username } = data;

    /** 創建使用者模型 */
    let user = { ...userModel, id:socket.id, username };

    /** 更新上線人物清單 */
    users.push(user);

    /** 通知所有使用者 */
    io.sockets.emit('onlineResponse', users);

  });

  /** 取得當前人物清單狀態 */
  socket.on('getUsers', (data) => {
    io.sockets.emit('usersResponse', users);
  });

  /** 更改使用者狀態 */
  socket.on('updateStates', (data) => {
    let { id, type } = data;

    /** 錯誤請求參數 */
    if( !id ){
      socket.emit('statesResponse', {statusd:500, message:'沒有使用者 GUID, 請確認使用者資訊'});
      return;
    }

    /** 無該 User ID */
    let check = users.find(item =>  item.id === id );

    if( !check )
    {
      socket.emit('statesResponse', {status:500, message:'錯誤的使用者 GUID, 請確認使用者資訊'});
      return;
    }
    
    /** 狀態值變更 */
    let updateUsers = users.map(item => {
      return ( item.id === id ) ? { ...item, type } : item;
    })

    console.log('updateUsers', updateUsers);

    users.length = 0;
    users.push(...updateUsers);

    /** 通知其他所有使用者狀態改變 */
    socket.broadcast.emit('statesResponse', users);
  });

  /** 邀請他人玩遊戲 
   *  @param { String } data.roomId 房間 ID
   *  @param { String } data.username 邀請者名稱
   *  @param { Array } data.menberList 受邀者名單陣列 
  */
  socket.on('invite', (data)=>{
    let { memberList, username, roomId } = data;
    let response = { memberList, roomId }

    /** 創建遊戲房間 */
    socket.join(roomId);

    if( memberList.length > 0 && roomId && username )
    {
      /** 通知受邀請者是否接受遊戲邀請 */
      memberList.forEach(menber => {
        io.to(menber.id).emit('inviteResponse', response);
      })
    }
  });
  
  /** 加入遊戲房間 */
  socket.on('joinRoom', (data) => {
    let { roomId } = data;
    socket.join(roomId);
  });

  /** 傳送猜拳狀態給其他人 */
  socket.on('sendResult', (data) => {
    let { id, roomId, result } = data;

    /** 向同一房間其他客户端發送消息，但不包括自己 */
    socket.to(roomId).emit('resultResponse', {id, result});
  });

});