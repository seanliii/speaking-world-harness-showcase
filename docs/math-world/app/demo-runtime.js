
const video=document.querySelector('#demo'),status=document.querySelector('#status');
document.querySelector('#play').onclick=async()=>{video.currentTime=0;try{await video.play();status.textContent='正在播放真实操作演示';}catch(e){status.textContent='播放失败：'+e.message;}};
document.querySelector('#pause').onclick=()=>{video.pause();status.textContent='已暂停';};
video.onended=()=>{status.textContent='播放结束，可重播或进入原型';};
