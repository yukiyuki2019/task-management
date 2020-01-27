'use strict';
const crypto = require('crypto');
const pug = require('pug');
const Cookies = require('cookies');
const util = require('./handler-util');
const Post = require('./post');

const trackingIdKey = 'tracking_id';

const oneTimeTokenMap = new Map(); // キーをユーザー名、値をトークンとする連想配列

function handle(req, res) {
  const cookies = new Cookies(req,res);
  const trackingId = addTrackingCookie(cookies, req.user);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll().then((posts) => {
        posts.forEach((post) => {
          post.content = post.content.replace(/\+/g, ' ');
        });
        const oneTimeToken = crypto.randomBytes(8).toString('hex');
        oneTimeTokenMap.set(req.user, oneTimeToken);
        res.end(pug.renderFile('./views/posts.pug', {
           posts: posts,
           user: req.user,
           oneTimeToken: oneTimeToken
          }));
          console.info(
            `閲覧されました: user: ${req.user}, ` +
            `trackingId: ${trackingId},` +
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
        const dataArray = decoded.split('&');
        const content = dataArray[0] ? dataArray[0].split('content=')[1] : '';
        const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
        if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
          console.info('追加しました: ' + content);
          Post.create({
            content: content,
            trackingCookie: trackingId,
            postedBy: req.user
          }).then(() => {
            oneTimeTokenMap.delete(req.user);
            handleRedirectPosts(req, res);
          });
        } else {
          util.handleBadRequest(req, res);
        }
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

// 削除処理
function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        body = Buffer.concat(body).toString();
        const decoded = decodeURIComponent(body);
        const dataArray = decoded.split('&');
        const id = dataArray[0] ? dataArray[0].split('id=')[1] : '';
        const requestedOneTimeToken = dataArray[1] ? dataArray[1].split('oneTimeToken=')[1] : '';
        if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
          Post.findByPk(id).then((post) => {
            if (req.user === post.postedBy) {
              post.destroy().then(() => {
                console.info(
                  `削除されました: user: ${req.user}, ` +
                  `remoteAddress: ${req.connection.remoteAddress}, ` +
                    `userAgent: ${req.headers['user-agent']} `
                );
                oneTimeTokenMap.delete(req.user);
                handleRedirectPosts(req, res);
              });
            }
          });
        } else {
          util.handleBadRequest(req, res);
        }
      });
      break;
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * Cookieに含まれているトラッキングIDに異常がなければその値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
 * @param {Cookies} cookies
 * @param {String} userName
 * @return {String} トラッキングID
 */
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24));
    const trackingId = originalId + '_' + createValidHash(originalId, userName);
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

const secretKey =
  `212fe4f71333e29dd7047f46959e71157a75b44053306e66bd023546130
  e2e563b353cea933f48ef190d3eceb8cb88bad80fbfe0aeb2fff41219fb3
  9828e42747fefe38ac717ded373dff2001ff1175f2b83829ad2db10cc5b2
  dc9d58eeeb7e7dbeb44ad89be360dff07f6b765a43d6d1287d3229e3b3b2
  4a44311202d6c7f5e45b3ac16c2a88cdefaec83655f77ce1481641f0af09
  2a1c9468a5b95b3995fe47175a2ef0cff5a3bfb4fecf4ba35c91d71e299e
  23e7c74c462931196a6d7474d3842411c446b9cd1fe2e5fb07fa15a3f23c
  1ee441039ebf73a59afdb7f573c71a99b3f4a1dd79ac10e6e936057a192b
  229e9467c28e545aebd6ffa522b0d97d9`;

function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);
  return sha1sum.digest('hex');
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}


module.exports = {
  handle,
  handleDelete
};