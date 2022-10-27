const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const formidable= require('formidable')
const multiparty = require('multiparty')
const SparkMD5 = require('spark-md5')
const path = require('path')


const index = require('./routes/index')
const users = require('./routes/users')

// error handler
onerror(app)


app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  //处理OPTIONS请求
  ctx.request.methods === 'OPTIONS' ? ctx.body = '请求测试成功' : await next()
})

// middlewares
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes
app.use(index.routes(), index.allowedMethods())
app.use(users.routes(), users.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
