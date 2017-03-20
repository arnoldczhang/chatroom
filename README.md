# chatroom

###Introduction
> a tiny chatroom(base on websocket+node+redis+mongodb)

Setup
``` bash
# install redis & start

# install mongodb & start

# install nginx & add a router like this & start
location /chatroom {
    alias ../chatroom/;
}

# run websocket
cd chatroom
node .\websocket.js

# serve docs at localhost:80
localhost:80/chatroom/socket.html
```

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2013-2016 Arnold Zhang