const router = require('koa-router')()
const fs = require('fs')

const { multipartyUpload, exists, wirteFile, parsePostParams, mergeFiles } = require('../utils/upload')

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})


//上传单个文件（form-data），利用第三方插件multipary解析并上传
router.post('/upload_single_file', async (ctx, next) => {
  try {
      let {
          files
      } = await multipartyUpload(ctx.req, true);
      let file = (files && files.file.length) ? files.file[0] : {};
      ctx.body = {
          code: 0,
          message: '文件上传成功',
          originalFilename: file.originalFilename,
          serverPath: file.path.replace(__dirname, HOSTNAME)
      }
  } catch (err) {
      ctx.body = {
          code: 1,
          message: '文件上传失败'
      }
  }
})


//上传单个文件（form-data），利用第三方插件解析但不直接上传，而是将文件重命名后再单独上传
router.post('/upload_single_formdata_rename', async (ctx, next) => {
  try {
      let {
          files,
          fields
      } = await multipartyUpload(ctx.req, false)
      let file = (files && files.file.length) ? files.file[0] : {}
      let filename = (fields && fields.filename.length) ? fields.filename[0] : ''
      const filePath = `${SERVER_PATH}/${filename}`
      let isExist = await exists(filePath)
      if (isExist) {
          ctx.body = {
              code: 0,
              message: '文件已经存在',
              originalFilename: filename,
              serverPath: file.path.replace(__dirname, HOSTNAME)
          }
          return
      }
      let obj = await writeFile(filePath, file, true)
      if (obj.result) {
          ctx.body = {
              code: 0,
              message: '文件上传成功',
              originalFilename: filename,
              serverPath: file.path.replace(__dirname, HOSTNAME)
          }
      } else {
          ctx.body = {
              code: 0,
              message: '文件上传失败'
          }
      }
  } catch (ex) {
      ctx.body = {
          code: 0,
          message: ex
      }
  }
})


//BASE64上传，该方式只能上传小图片，大图片不建议使用这种方式会造成程序卡死，大图片使用form-data上传
router.post('/upload_base64', async (ctx, next) => {
  try {
      let {
          file,
          filename
      } = await parsePostParams(ctx.req)
      file = decodeURIComponent(file)
      const suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1]
      let spark = new SparkMD5.ArrayBuffer();
      file = file.replace(/^data:image\/\w+;base64,/, "")
      file = Buffer.from(file, 'base64')
      spark.append(file)
      let filepath = `${SERVER_PATH}/${spark.end()}.${suffix}`
      await delay()
      const isExists = await exists(filepath);
      if (isExists) {
          ctx.body = {
              code: 0,
              message: '文件已经存在',
              originalFilename: filename,
              serverPath: file.path.replace(__dirname, HOSTNAME)
          }
          return
      }
      let obj = await writeFile(filepath, file, false)
      if (obj.result) {
          ctx.body = {
              code: 0,
              message: '文件上传成功',
              originalFilename: filename,
              serverPath: filepath.replace(__dirname, HOSTNAME)
          }
      } else {
          ctx.body = {
              code: 0,
              message: '文件上传失败'
          }
      }
  } catch (err) {
      console.log(err)
      ctx.body = {
          code: 0,
          message: err
      }
  }
})


//大文件切片上传
router.post('/upload_chunk', async (ctx, next) => {
  try {
      let {
          files,
          fields
      } = await multipartyUpload(ctx.req, false)
      let file = (files && files.file[0]) || {}
      let filename = (fields && fields.filename[0]) || ''
      let [, hash] = /^([^_]+)_(\d+)/.exec(filename)
      const dirPath = `${SERVER_PATH}/${hash}`
      if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath)
      }
      const filePath = `${dirPath}/${filename}`
      const isExists = await exists(filePath)
      if (isExists) {
          ctx.body = {
              code: 0,
              message: '文件已经存在',
              originalFilename: filename,
              serverPath: filePath.replace(__dirname, HOSTNAME)
          }
          return;
      }
      await wirteFile(filePath, file, true)
      ctx.body = {
          code: 0,
          message: '文件上传成功',
          serverPath: filePath.replace(__dirname, HOSTNAME)
      }
  } catch (err) {
      ctx.body = {
          code: 1,
          message: err
      }
  }
})


//合并切片文件
router.post('/upload_merge', async (ctx, next) => {
  const {
      hash,
      count
  } = await parsePostParams(ctx.req);
  const {
      path,
      filename
  } = await mergeFiles(hash, count);
  ctx.body = {
      code: 0,
      message: '文件上传成功',
      path,
      filename
  }
})


//获取已上传的切片
router.get('/uploaded', async (ctx, next) => {
  try {
      const {
          hash
      } = ctx.request.query
      const dirPath = `${SERVER_PATH}/${hash}`
      const filelist = fs.readdirSync(dirPath)
      filelist.sort((a, b) => {
          const reg = /_([\d+])/;
          return reg.exec(a)[1] - reg.exec(b)[1]
      });
      ctx.body = {
          code: 0,
          message: '获取成功',
          filelist
      }
  } catch (err) {
      ctx.body = {
          code: 0,
          message: '获取失败'
      }
  }
})

module.exports = router
