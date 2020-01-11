'use strict';
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');

const trackingIdKey = 'tracking_id';

function handle(req, res) {
  const cookies = new Cookies(req,res);
  addTrackingCookie(cookies);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll().then((posts) => {
        res.end(pug.renderFile('./views/posts.pug', {
           posts: posts 
          }));
          console.info(
            `閲覧されました: user: ${req.user}, ` +
            `trackingId: ${cookies.get(trackingIdKey) },` +
            `remoteAddress: ${req.connection.remoteAddress} ,` +
            `userAgent: ${req.headers['user-agent']}`
          );
      });
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
        Post.create({
          content: content,
          trackingCookie: cookies.get(trackingIdKey),
          postedBy: req.user
        }).then(() => {
          handleRedirectPosts(req, res);
        });
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function addTrackingCookie(cookies) {
  if (!cookies.get(trackingIdKey)) {
    const trackingId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const nextMonth = new Date(Date.now() + (1000 * 60 * 60 * 24 * 30));
    cookies.set(trackingIdKey, trackingId, { expires: nextMonth });
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