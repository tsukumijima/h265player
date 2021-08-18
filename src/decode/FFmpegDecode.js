/**
 * @copyright: Copyright (C) 2019
 * @desc: wasm methods to decode
 * @author: liuliguo 
 * @file: FFmpegDecode.js
 */
export default class FFmpegDecode {
  constructor(decode) {
    this.decode = decode
    // In case multiple frames are decoded (flush)
    this.result = []
  }
  openDecode() {
    let that = this
    let videoSize = 0
    let videoCallback = Module.addFunction(function(
      addr_y,
      addr_u,
      addr_v,
      stride_y,
      stride_u,
      stride_v,
      width,
      height,
      pts
    ) {
      console.log("[%d]In video callback, size = %d * %d, pts = %d", ++videoSize, width, height, pts)
      let out_y = HEAPU8.subarray(addr_y, addr_y + stride_y * height)
      let out_u = HEAPU8.subarray(addr_u, addr_u + (stride_u * height) / 2)
      let out_v = HEAPU8.subarray(addr_v, addr_v + (stride_v * height) / 2)
      let obj = {
        stride_y,
        stride_u,
        stride_v,
        width,
        height,
        buf_y: new Uint8Array(out_y),
        buf_u: new Uint8Array(out_u),
        buf_v: new Uint8Array(out_v),
        pts
      }
      that.result.push(obj)
    },
      // signature string
      // ref: https://github.com/sonysuqin/WasmVideoPlayer/issues/38
      'viiiiiiiii',
    )

    const LOG_LEVEL_WASM = 2;
    const DECODER_H264 = 0;
    const DECODER_H265 = 1;
    const DECODER_MPEG2VIDEO = 2;
    Module._openDecoder(DECODER_MPEG2VIDEO, videoCallback, LOG_LEVEL_WASM)
  }
  decodeData(pes, pts) {
    let fileSize = pes.length
    let cacheBuffer = Module._malloc(fileSize)
    Module.HEAPU8.set(pes, cacheBuffer)
    Module._decodeData(cacheBuffer, fileSize, pts)
    Module._free(cacheBuffer)
  }
  flush() {
    Module._flushDecoder()
    while(this.checkData()) {
        this.decode.getDecodeYUV()
    }
  }
  closeDecode() {
    Module._closeDecoder()
  }
  getYUV() {
    let res = null
    if(this.result.length > 0) {
      res = this.result.shift()
    }
    return res
  }
  checkData() {
    let length = this.result.length
    return length > 0
  }
  
}
