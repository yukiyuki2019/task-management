'use strict';
const pug = require('pug');
const util = require('./handler-util');
const contents = [];

function handle(req, res) {
  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(pug.renderFile('./views/posts.pug', { contents: contents }));
      break;
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);
        const content = decoded.split('content=')[1];
        console.info('追加しました: ' + content);
        contents.push(content);
        console.info('全タスク: ' + contents);
        handleRedirectPosts(req, res);
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}
/*
function onButtonClick() {
  const checkbox1 = document.getElementById('Checkbox1');
  const checkbox2 = document.getElementById('Checkbox2');

  if (checkbox1.checked == true && checkbox2.checked == true) {
    console.log('緊急&重要');
  } else if (checkbox1.checked == true) {
    console.log('緊急');
  } else if (checkbox2.checked == true) {
    console.log('重要');
  } else {
    console.log('その他');
  }
}
*/

module.exports = {
  handle
};