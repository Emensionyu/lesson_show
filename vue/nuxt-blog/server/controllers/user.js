import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import md5 from 'md5'
import axios from 'axios'
import url from 'url'
import config from '../config'

const User = mongoose.model('User')

const domain = config.app.domain ? config.app.domain : `http://${config.app.host}:${config.app.port}`

export const login = async(ctx, next) => {
  let { username, password } = ctx.request.body
  password = md5(password)
  try {
    let user = await User.findOne({username: username, password: password}).exec()
    let secret = config.jwt.secret
    let expiresIn = config.jwt.expiresIn
    let token = jwt.sign({ username: user.username, userID: user._id }, secret)
    ctx.cookies.set('token', token)
    ctx.body = {
      success: true,
      data: {
        token: token
      }
    }
  } catch (e) {
    ctx.body = {
      success: false,
      err: e
    }
  }
}

export const logout = (ctx, next) => {
  ctx.cookies.set('token', null)
  ctx.body = {
    success: true,
    data: {}
  }
}

export const getUserInfo = async(ctx, next) => {
  let { username } = ctx.params
  let avatarUrl = domain + '/public/' + config.user.avatar
  if(!username){
    // 获取管理员信息
    try {
      let data = await User.findOne({ role: 'superAdmin' }).exec()
      data.avatar = avatarUrl
      ctx.body = {
        success: true,
        data: data
      }
    } catch (e) {
      ctx.body = {
        success: false,
        err: e
      }
    }
  } else {
    // 获取普通用户信息
    try {
      let data = await User.findOne({ username: username }).exec()
      ctx.body = {
        success: true,
        data: data
      }
    } catch (e) {
      ctx.body = {
        success: false,
        err: e
      }
    }
  }
}

export const patchUserInfo = async(ctx, next) => {
  let body = ctx.request.body

  if (body.oldPassword && body.newPassword) {
    // 更新管理员密码
    let oldPassword = md5(body.oldPassword)
    let newPassword = md5(body.newPassword)
    try {
      let user = await User.findOne({ role: 'superAdmin' }).exec()
      if (user.password !== oldPassword) {
        return (ctx.body = {
          success: false,
          err: 'Wrong password'
        })
      }
      body = await User.findOneAndUpdate({ role: 'superAdmin' }, { password: newPassword, updatedAt: Date.now() }).exec()
      ctx.body = {
        success: true,
        data: body
      }
    } catch (e) {
      ctx.body = {
        success: false,
        err: e
      }
    }
  } else {
    // 更新管理员信息
    body.updatedAt = Date.now()
    try {
      body = await User.findOneAndUpdate({ role: 'superAdmin' }, body).exec()
      ctx.body = {
        success: true,
        data: body
      }
    } catch (e) {
      ctx.body = {
        success: false,
        err: e
      }
    }
  }
}