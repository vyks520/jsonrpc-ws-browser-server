# jsonrpc-ws-browser-server
jsonrpc-ws-browser-server是一个以浏览器为JSON-RPC 2.0服务端，用于后端向浏览器进行主动调用，例如聊天信息推送等。 

本项目在基于 [steemit/koa-jsonrpc](https://github.com/steemit/koa-jsonrpc) 改造

需配合后端项目使用。

后端地址：[jsonrpc-ws-browser-client](https://github.com/vyks520/jsonrpc-ws-browser-client) ，后端使用golang实现，其他语言需要自己实现客户端。



## Installation

使用CDN(浏览器中)，下载dist/iife/index.js到项目中使用

```
<script src="../dist/iife/index.js"></script>
```

没有制作NPM包，需要将复制到项目中使用

```javascript
import {JsonRpcServer} from './dist/index.mjs';
```

## Getting started  ``example.html``

[后端示例地址](https://github.com/vyks520/jsonrpc-ws-browser-client/example/example.go)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>jsonrpcTest</title>
</head>
<body style="width: 100vw;height:100vh;display:flex;justify-content: center;align-items: center;">
<div class="message-text" style="font-size: 20px"></div>
<script src="../dist/iife/index.js"></script>
<script type="application/javascript">
    const messageTextEl = document.querySelector('.message-text');
    const jsonRpc = new jsonrpcWsBrowserServer.JsonRpcServer('ws://127.0.0.1:8080/jsonrpc-client');
    jsonRpc.onopen = () => {
        messageTextEl.textContent = 'jsonrpc连接成功';
    };
    jsonRpc.onerror = (e) => {
        messageTextEl.textContent = e;
    };
    jsonRpc.open().catch();
    let err = jsonRpc.register('show-date', function (userId, date) {
        this.assert(date, 'date参数不能为空');
        this.assertEqual(userId, '001', '用户id不正确');
        messageTextEl.textContent = date;
        return 'ok';
    });
    if (err) {
        console.error(err);
    }
</script>
</body>
</html>
```