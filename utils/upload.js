const fs = require('fs')
const multiparty = require('multiparty')
const formidable= require('formidable')
// 检测文件是否存在
function exists(path) {
    return new Promise((resolve, reject) => {
        fs.access(path, fs.constants.F_OK, err => {
            if(err) {
              resolve(false)
              return  
            }
            resolve(true)
        })
    })
}

// 利用multiparty插件解析前端传来的form-data格式的数据，并上传至服务器
function multipartyUpload(req, autoUpload) {
    let config = {
        maxFieldSize: 200 * 1024 * 1024
    }
    if(autoUpload) config.uploadDir = SERVER_PATH
    return new Promise((resolve, reject) => {
        new multiparty.Form(config).parse(req, (err, fields, files) => {
            if(err) {
                reject(err)
                return
            }
            resolve({
                fields,
                files
            })
        })
    })
}

//将传进来的文件数据写入服务器
//form-data格式的数据将以流的形式写入
//BASE64格式数据则直接将内容写入
function wirteFile(serverPath, file, isStream){
	return new Promise((resolve, reject)=>{
		if(isStream){
			try{
				let readStream = fs.createReadStream(file.path)
				let writeStream = fs.createWriteStream(serverPath)
				readStream.pipe(writeStream)
				readStream.on('end',()=>{
					resolve({
						result: true,
						message: '上传成功！'
					});
					fs.unlinkSync(file.path)
				});
			}catch(err){
				resolve({
					result: false,
					message: err
				})
			}
		}else{
			fs.writeFile(serverPath,file, err=>{
				if(err){
					resolve({
						result: false,
						message: err
					})
					return
				}
				resolve({
					result: true,
					message: '上传成功！'
				})
			})
		}
	})
}

//解析post请求参数，content-type为application/x-www-form-urlencoded 或 application/josn
function parsePostParams(req){
	return new Promise((resolve, reject)=>{
		let form = new formidable.IncomingForm()
		form.parse(req,(err,fields)=>{
			if(err){
				reject(err)
				return
			}
			resolve(fields)
		})
	})
}

function mergeFiles(hash, count) {
	return new Promise((resolve, reject)=>{
		const dirPath = `${SERVER_PATH}/${hash}`
		if(!fs.existsSync(dirPath)){
			reject('还没上传文件，请先上传文件')
			return
		}
		const filelist = fs.readdirSync(dirPath)
		if(filelist.length < count){
			reject('文件还未上传完成，请稍后再试')
			return
		}
		let suffix;
		filelist.sort((a,b)=>{
			const reg = /_(\d+)/
			return reg.exec(a)[1] - reg.exec(b)[1]
		}).forEach(item =>{
		 !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1]: null
		 //将每个文件读取出来并append到以hash命名的新文件中
		 fs.appendFileSync(`${SERVER_PATH}/${hash}.${suffix}`, fs.readFileSync(`${dirPath}/${item}`))
		 fs.unlinkSync(`${dirPath}/${item}`) //删除切片文件
		});
		
		// await delay(1000) //等待1秒后删除新产生的文件夹
		fs.rmdirSync(dirPath)
		resolve({
			path:`${HOSTNAME}/upload/${hash}.${suffix}`,
			filename: `${hash}.${suffix}`
		})
	})
}

module.exports = {
    mergeFiles,
    parsePostParams,
    wirteFile,
    multipartyUpload,
    exists
}