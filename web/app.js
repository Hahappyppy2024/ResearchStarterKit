import {markPaperRead,renderReadingStats,READING_STATE_KEY,READING_HISTORY_KEY} from "./reading-history.mjs";
import {openReader,paperTaskProgress,paperTaskTotal,markPaperTaskDone} from "./paper-reader.js";
import {cleanTodos,plannedTasks,currentTask,timeMinutes,scheduledBase,cleanScheduleOverrides,cleanHiddenSchedule,cleanSubtasks,cleanPaper} from "./todos.mjs";
import {schedule,reminders,timeLabel,chinaTime,currentAt,nextAt,shiftDate,calendarText} from "./schedule.mjs";
const $=id=>document.getElementById(id);
const key="daily-practice-v1";
let db={days:{},notifications:false},storageOkay=true;
try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved?.days&&typeof saved.days==="object")db={days:saved.days,notifications:saved.notifications===true}}catch{storageOkay=false}
let selected=chinaTime().date,lastToday=selected,followToday=true,lastMinute=null;
let editingTodo=null,removedTodo=null,editingSchedule=null,scheduleUndo=null,removedSubtask=null;
function day(){const value=db.days[selected]||{};return {...value,done:Array.isArray(value.done)?value.done:[],notes:typeof value.notes==="string"?value.notes:"",todos:cleanTodos(value.todos),scheduleOverrides:cleanScheduleOverrides(schedule,value.scheduleOverrides),hiddenSchedule:cleanHiddenSchedule(schedule,value.hiddenSchedule),subtasks:cleanSubtasks(schedule,value.todos,value.subtasks)}}
function tasksFor(date){return plannedTasks(scheduledBase(schedule,db.days[date]||{}),db.days[date]?.todos)}
function totalTasks(){return [...new Map([...tasksFor(selected),...day().todos].map(t=>[t.id,t])).values()]}
function refreshTodos(){lastMinute=null;renderDay(false);tick()}
function fillTimeChoices(id,value=""){
  const control=$(id),isEnd=id.endsWith("end");control.replaceChildren();
  const empty=document.createElement("option");empty.value="";empty.textContent="选择时间";control.append(empty);
  for(let minute=isEnd?30:0;minute<=(isEnd?1440:1410);minute+=30){const option=document.createElement("option");option.value=timeLabel(minute);option.textContent=option.value;control.append(option)}
  // Keep previously saved minute-level times until the user explicitly changes them.
  if(value&&![...control.options].some(o=>o.value===value)){const legacy=document.createElement("option");legacy.value=value;legacy.textContent=value+"（原记录）";legacy.disabled=true;control.append(legacy)}
  control.value=value;
}
function setTimePair(prefix,start,end){fillTimeChoices(prefix+"-start",start===null?"":timeLabel(start));fillTimeChoices(prefix+"-end",end===null?"":timeLabel(end))}
for(const prefix of ["todo","schedule-edit"]){setTimePair(prefix,null,null);$(prefix+"-start").onchange=()=>{const start=timeMinutes($(prefix+"-start").value),end=timeMinutes($(prefix+"-end").value);if(start!==null&&(end===null||end<=start))fillTimeChoices(prefix+"-end",timeLabel(start+30))}}
function resetTodoForm(){editingTodo=null;$("todo-form").reset();setTimePair("todo",null,null);$("todo-submit").textContent="添加待办";$("todo-cancel").hidden=true}
function paperActions(paper){
  const actions=document.createElement("span");actions.className="task-paper-actions";
  const abstract=document.createElement("button");abstract.type="button";abstract.textContent="中英摘要";abstract.setAttribute("aria-label","阅读摘要："+paper.title);abstract.onclick=()=>openReader(paper.id);actions.append(abstract);const checklist=document.createElement("button");checklist.type="button";checklist.textContent=`阅读清单 ${paperTaskProgress(paper.id)}/${paperTaskTotal}`;checklist.dataset.paperChecklist=paper.id;checklist.setAttribute("aria-label","论文阅读清单："+paper.title);checklist.onclick=()=>openReader(paper.id,"tasks");actions.append(checklist);
  if(paper.url){const link=document.createElement("a");link.textContent="原文 ↗";link.href=paper.url;link.target="_blank";link.rel="noopener";actions.append(link)}
  return actions;
}
function projectActions(task){const a=document.createElement("a");a.className="task-project-actions";a.href=task.kind==="learning"?"http://127.0.0.1:8770/learning?module="+encodeURIComponent(task.projectId)+"&deck="+encodeURIComponent(task.deckId):"http://127.0.0.1:8770/?project="+encodeURIComponent(task.projectId);a.target="_blank";a.rel="noopener";a.textContent=(task.kind==="learning"?"打开学习 PPT · ":"打开项目 · ")+task.projectName+" ↗";return a}
function renderSubtasks(task){
  const area=document.createElement("details");area.className="subtasks";
  const items=day().subtasks[task.id]||[],summary=document.createElement("summary");
  summary.textContent=`子任务 ${items.filter(t=>t.done).length} / ${items.length} · 不计时`;
  area.open=items.length>0;area.append(summary);
  const setItems=next=>{updateDay({subtasks:{...day().subtasks,[task.id]:next}});refreshTodos()};
  for(const item of items){
    const row=document.createElement("div");row.className="subtask-row";
    const label=document.createElement("label"),check=document.createElement("input"),name=document.createElement("span");
    check.type="checkbox";check.checked=item.done;check.setAttribute("aria-label",`子任务完成：${item.title}`);name.textContent=item.title;name.classList.toggle("subtask-done",item.done);label.append(check,name);
    check.onchange=()=>{if(item.paper)recordPaperRead(item.paper.id,check.checked);setItems(items.map(t=>t.id===item.id?{...t,done:check.checked}:t))};
    const edit=document.createElement("button"),remove=document.createElement("button");edit.type=remove.type="button";edit.textContent="编辑";remove.textContent="删除";edit.setAttribute("aria-label","编辑子任务："+item.title);remove.setAttribute("aria-label","删除子任务："+item.title);
    const editForm=document.createElement("form"),editInput=document.createElement("input"),save=document.createElement("button"),cancel=document.createElement("button");editForm.className="subtask-add";editForm.hidden=true;editInput.type="text";editInput.maxLength=160;editInput.required=true;editInput.value=item.title;editInput.setAttribute("aria-label","修改子任务："+item.title);save.type="submit";save.textContent="保存";cancel.type="button";cancel.textContent="取消";editForm.append(editInput,save,cancel);
    edit.onclick=()=>{editForm.hidden=false;editInput.focus()};cancel.onclick=()=>{editForm.hidden=true};editForm.onsubmit=e=>{e.preventDefault();const title=editInput.value.trim();if(title)setItems(items.map(t=>t.id===item.id?{...t,title}:t))};
    remove.onclick=()=>{removedSubtask={date:selected,taskId:task.id,item,index:items.indexOf(item)};setItems(items.filter(t=>t.id!==item.id))};row.append(label,edit,remove);area.append(row);if(item.paper)area.append(paperActions(item.paper));area.append(editForm);
  }
  const form=document.createElement("form"),input=document.createElement("input"),add=document.createElement("button");form.className="subtask-add";input.type="text";input.maxLength=160;input.required=true;input.placeholder="添加子任务，不设时间";input.setAttribute("aria-label","新子任务："+task.title);add.type="submit";add.textContent="添加";add.setAttribute("aria-label","添加子任务："+task.title);form.append(input,add);form.onsubmit=e=>{e.preventDefault();const title=input.value.trim();if(title)setItems([...items,{id:"sub-"+crypto.randomUUID(),title,done:false}])};area.append(form);
  if(removedSubtask?.date===selected&&removedSubtask.taskId===task.id){area.open=true;const undo=document.createElement("button");undo.type="button";undo.textContent="撤销删除子任务";undo.onclick=()=>{const copy=[...items],u=removedSubtask;copy.splice(u.index,0,u.item);removedSubtask=null;setItems(copy)};area.append(undo)}
  return area;
}
function renderTodos(){
 $("todo-date-label").textContent=selected;$("todo-list").replaceChildren();
 for(const todo of day().todos){const row=document.createElement("div");row.className="todo-item"+(day().done.includes(todo.id)?" done":"");const label=document.createElement("label"),check=document.createElement("input"),body=document.createElement("span"),title=document.createElement("span"),time=document.createElement("small");check.type="checkbox";check.checked=day().done.includes(todo.id);check.setAttribute("aria-label","待办完成："+todo.title);title.textContent=todo.title;time.textContent=todo.start===null?"未安排时间":`${timeLabel(todo.start)}–${timeLabel(todo.end)} · 已加入今日安排`;body.append(title,time);label.append(check,body);check.onchange=()=>{const done=new Set(day().done);if(check.checked)done.add(todo.id);else done.delete(todo.id);if(todo.studyTask)markPaperTaskDone(todo.studyTask.paperId,todo.studyTask.taskId,check.checked);if(todo.paper)recordPaperRead(todo.paper.id,check.checked);updateDay({done:[...done]});refreshTodos()};const actions=document.createElement("div");actions.className="todo-item-actions";const edit=document.createElement("button"),remove=document.createElement("button");edit.type=remove.type="button";edit.textContent="编辑";remove.textContent="删除";edit.setAttribute("aria-label","编辑待办："+todo.title);remove.setAttribute("aria-label","删除待办："+todo.title);edit.onclick=()=>{editingTodo=todo.id;$("todo-title").value=todo.title;setTimePair("todo",todo.start,todo.end);$("todo-submit").textContent="保存修改";$("todo-cancel").hidden=false;$("todo-title").focus()};remove.onclick=()=>{removedTodo={date:selected,todo,subtasks:day().subtasks[todo.id]||[],done:day().done.includes(todo.id)};updateDay({todos:day().todos.filter(t=>t.id!==todo.id),done:day().done.filter(id=>id!==todo.id)});if(editingTodo===todo.id)resetTodoForm();refreshTodos();$("todo-status").textContent="已删除待办，可撤销。"};actions.append(edit,remove);row.append(label,actions);if(todo.studyTask){const b=document.createElement("button");b.className="button";b.textContent="打开论文任务与回答";b.onclick=()=>openReader(todo.studyTask.paperId,"tasks");row.append(b);const detail=document.createElement("p");detail.className="small muted";detail.textContent=todo.detail;row.append(detail)}if(todo.paper)row.append(paperActions(todo.paper));if(todo.projectTask)row.append(projectActions(todo.projectTask));row.append(renderSubtasks(todo));$("todo-list").append(row)}
 if(!day().todos.length){const empty=document.createElement("p");empty.className="small muted";empty.textContent="这一天还没有额外待办。";$("todo-list").append(empty)}
 $("todo-undo").hidden=!removedTodo||removedTodo.date!==selected;
}
function toast(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$("toast").hidden=true,4500)}
function save(){
  try{localStorage.setItem(key,JSON.stringify(db));storageOkay=true;$("save-status").textContent="已保存到当前浏览器"}catch{storageOkay=false;$("save-status").textContent="保存失败，请导出备份，避免丢失记录";toast("浏览器无法保存，请导出备份")}
}
function updateDay(updates){db.days[selected]={...day(),...updates};save()}
function renderProgress(){
  const tasks=totalTasks(),n=tasks.filter(s=>day().done.includes(s.id)).length;
  $("progress-count").textContent=`${n} / ${tasks.length}`;
  $("progress-fill").style.width=`${tasks.length?n/tasks.length*100:0}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow",n);document.querySelector(".progress-track").setAttribute("aria-valuemax",tasks.length);
}
function durationLabel(minutes){return [Math.floor(minutes/60)?`${Math.floor(minutes/60)} 小时`:"",minutes%60?`${minutes%60} 分钟`:""].filter(Boolean).join(" ")}
function renderDay(announceDate=true){
  $("date").value=selected;
  $("schedule-heading").textContent=selected===chinaTime().date?"今日安排":"每日安排";
  $("day-label").textContent=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long",day:"numeric",weekday:"long",timeZone:"Asia/Shanghai"}).format(new Date(`${selected}T12:00:00+08:00`));
  $("schedule").replaceChildren();
  const state=day();
  const planned=tasksFor(selected);$("schedule-window").textContent=planned.length?`${timeLabel(Math.min(...planned.map(t=>t.start)))} — ${timeLabel(Math.max(...planned.map(t=>t.end)))}`:"尚未安排";
  for(const task of planned){
    const row=document.createElement("div");row.className="task";row.dataset.id=task.id;row.dataset.start=task.start;row.dataset.end=task.end;
    row.innerHTML=`<div class="task-time">${timeLabel(task.start)}–${timeLabel(task.end)}<div class="task-duration">${durationLabel(task.end-task.start)}</div></div><div><div class="task-title"><i class="task-marker ${task.type}"></i><span class="task-name"></span><span class="task-badge" hidden>进行中</span></div><p class="task-details"></p></div><input type="checkbox">`;
    row.querySelector(".task-name").textContent=task.title;
    row.querySelector(".task-details").textContent=task.detail;
    const check=row.querySelector("input");check.checked=state.done.includes(task.id);check.setAttribute("aria-label",`完成：${task.title}`);
    row.classList.toggle("done",check.checked);
    check.addEventListener("change",()=>{const done=new Set(day().done);if(check.checked)done.add(task.id);else done.delete(task.id);if(task.studyTask)markPaperTaskDone(task.studyTask.paperId,task.studyTask.taskId,check.checked);if(task.paper)recordPaperRead(task.paper.id,check.checked);updateDay({done:[...done]});refreshTodos()});
    const actions=document.createElement("div");actions.className="schedule-item-actions";const edit=document.createElement("button"),remove=document.createElement("button");edit.type=remove.type="button";edit.textContent="编辑";remove.textContent="删除";edit.setAttribute("aria-label","编辑安排："+task.title);remove.setAttribute("aria-label","删除安排："+task.title);edit.onclick=()=>openScheduleEditor(task);remove.onclick=()=>deleteScheduleTask(task);actions.append(edit,remove);row.children[1].append(actions);if(task.studyTask){const b=document.createElement("button");b.className="button";b.textContent="打开论文任务与回答";b.onclick=()=>openReader(task.studyTask.paperId,"tasks");row.children[1].append(b)}if(task.paper)row.children[1].append(paperActions(task.paper));if(task.projectTask)row.children[1].append(projectActions(task.projectTask));row.children[1].append(renderSubtasks(task));
    $("schedule").append(row);
  }
  if(!planned.length){const empty=document.createElement("p");empty.className="small muted";empty.textContent="这一天暂无定时安排，可从 Todo List 添加。";$("schedule").append(empty)}
  $("schedule-undo").hidden=!scheduleUndo||scheduleUndo.date!==selected;$("schedule-reset").disabled=!state.hiddenSchedule.length&&!Object.keys(state.scheduleOverrides).length;
  $("notes").value=state.notes??"";
  $("save-status").textContent=storageOkay?"记录保存在当前浏览器":"浏览器存储不可用，请导出备份";
  renderTodos();renderProgress();highlightCurrent();
  if(announceDate)window.dispatchEvent(new CustomEvent("schedule-date-change",{detail:selected}));
}
function selectDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value)))return;
  selected=value;followToday=selected===chinaTime().date;resetTodoForm();renderDay();
}
function highlightCurrent(){
  const ct=chinaTime(),current=currentTask(tasksFor(ct.date),ct.minute);
  for(const row of document.querySelectorAll(".task")){
    const active=selected===ct.date&&current?.id===row.dataset.id&&ct.minute>=Number(row.dataset.start)&&ct.minute<Number(row.dataset.end);
    row.classList.toggle("active",active);row.querySelector(".task-badge").hidden=!active;
  }
}
function tick(){
  const ct=chinaTime();$("clock").textContent=ct.clock;
  if(ct.date!==lastToday){lastToday=ct.date;if(followToday){selected=ct.date;renderDay()}else highlightCurrent()}
  if(lastMinute!==`${ct.date}:${ct.minute}`){
    lastMinute=`${ct.date}:${ct.minute}`;
    const todayTasks=tasksFor(ct.date),task=currentTask(todayTasks,ct.minute),next=[...todayTasks,...reminders.filter(t=>t.id==="sleep")].sort((a,b)=>a.start-b.start).find(t=>t.start>ct.minute)||schedule[0];
    $("current-title").textContent=task?.title??"休息，明天再出发";
    $("current-detail").textContent=task?.detail??"收好今天的收获。明早 06:00 起床，开始新的一天。";
    $("current-time").textContent=task?`${timeLabel(task.start)} — ${timeLabel(task.end)}`:"23:00 — 次日 06:00";
    $("remaining").textContent=task?`本时段还剩 ${task.end-ct.minute} 分钟`:"";
    $("next-title").textContent=next.title;
    $("next-time").textContent=`${next.start<=ct.minute?"明天 ":""}${timeLabel(next.start)} — ${timeLabel(next.end)}`;
    highlightCurrent();
    if(db.notifications&&"Notification" in window&&Notification.permission==="granted"){
      for(const reminder of [...reminders.filter(t=>t.id==="sleep"),...tasksFor(ct.date).filter(t=>t.alert&&(!t.custom||!db.days[ct.date]?.done?.includes(t.id)))].filter(s=>s.start===ct.minute)){
        const sentKey=`daily-notified:${ct.date}:${reminder.id}:${reminder.start}`;
        let sent=false;try{sent=localStorage.getItem(sentKey)==="1"}catch{}
        if(!sent){try{new Notification(reminder.title,{body:reminder.detail,tag:sentKey});localStorage.setItem(sentKey,"1")}catch{toast(`现在：${reminder.title}`)}}
      }
    }
  }
}
function openScheduleEditor(task){editingSchedule={id:task.id,date:selected,custom:!!task.custom};$("schedule-edit-title").value=task.title;setTimePair("schedule-edit",task.sourceStart??task.start,task.sourceEnd??task.end);$("schedule-edit-detail").value=task.custom?(day().todos.find(t=>t.id===task.id)?.detail||""):task.detail||"";$("schedule-edit-status").textContent="修改仅保存到 "+selected+"。分段任务编辑的是整项原始安排；新增任务占用的时间会自动分离。";$("schedule-edit-dialog").showModal()}
function deleteScheduleTask(task){const done=day().done.includes(task.id);if(task.custom){const todo=day().todos.find(t=>t.id===task.id);scheduleUndo={date:selected,kind:"custom",todo,subtasks:day().subtasks[todo.id]||[],done};removedTodo={date:selected,todo,subtasks:day().subtasks[todo.id]||[],done};updateDay({todos:day().todos.filter(t=>t.id!==task.id),done:day().done.filter(id=>id!==task.id)});if(editingTodo===task.id)resetTodoForm()}else{scheduleUndo={date:selected,kind:"base",id:task.id,done};updateDay({hiddenSchedule:[...day().hiddenSchedule,task.id],done:day().done.filter(id=>id!==task.id)})}refreshTodos();$("schedule-status").textContent="已从当天安排移除“"+task.title+"”，可撤销。"}
$("schedule-undo").onclick=()=>{if(!scheduleUndo||scheduleUndo.date!==selected)return;const u=scheduleUndo,done=new Set(day().done);if(u.done)done.add(u.kind==="base"?u.id:u.todo.id);if(u.kind==="base")updateDay({hiddenSchedule:day().hiddenSchedule.filter(id=>id!==u.id),done:[...done]});else{updateDay({todos:[...day().todos.filter(t=>t.id!==u.todo.id),u.todo],subtasks:{...day().subtasks,[u.todo.id]:u.subtasks||[]},done:[...done]});if(removedTodo?.todo.id===u.todo.id)removedTodo=null}scheduleUndo=null;refreshTodos();$("schedule-status").textContent="已恢复安排。"};
$("schedule-reset").onclick=()=>{updateDay({scheduleOverrides:{},hiddenSchedule:[]});scheduleUndo=null;refreshTodos();$("schedule-status").textContent="已恢复当天的默认安排，Todo 待办保留。"};
$("schedule-edit-cancel").onclick=()=>$("schedule-edit-dialog").close();
$("schedule-edit-form").onsubmit=e=>{e.preventDefault();if(!editingSchedule||editingSchedule.date!==selected)return;const title=$("schedule-edit-title").value.trim(),start=timeMinutes($("schedule-edit-start").value),end=timeMinutes($("schedule-edit-end").value),detail=$("schedule-edit-detail").value;if(!title||start===null||end===null||end<=start){$("schedule-edit-status").textContent="请填写名称和有效起止时间，结束时间须晚于开始时间。";return}const values={title,start,end,detail};if(editingSchedule.custom){updateDay({todos:[...day().todos.filter(t=>t.id!==editingSchedule.id),{...day().todos.find(t=>t.id===editingSchedule.id),...values}]})}else updateDay({scheduleOverrides:{...day().scheduleOverrides,[editingSchedule.id]:values}});$("schedule-edit-dialog").close();editingSchedule=null;refreshTodos();$("schedule-status").textContent="已保存当天修改，重叠时间已自动分离。"};
$("todo-form").onsubmit=e=>{e.preventDefault();const title=$("todo-title").value.trim(),startValue=$("todo-start").value,endValue=$("todo-end").value,start=timeMinutes(startValue),end=timeMinutes(endValue);if(!title)return;if((startValue||endValue)&&(start===null||end===null||end<=start)){$("todo-status").textContent="请填写有效的起止时间，结束时间须晚于开始时间。";return}const todo={...day().todos.find(t=>t.id===editingTodo),id:editingTodo||"todo-"+crypto.randomUUID(),title,start,end};const todos=day().todos.filter(t=>t.id!==todo.id);todos.push(todo);updateDay({todos});resetTodoForm();refreshTodos();$("todo-status").textContent=start===null?"已加入待办清单，之后可编辑时间。":"已插入今日安排，原任务在开始处暂停，结束后继续；其他时段保持不变。"};
$("todo-cancel").onclick=resetTodoForm;
$("todo-undo").onclick=()=>{if(!removedTodo||removedTodo.date!==selected)return;const done=new Set(day().done);if(removedTodo.done)done.add(removedTodo.todo.id);updateDay({todos:[...day().todos,removedTodo.todo],subtasks:{...day().subtasks,[removedTodo.todo.id]:removedTodo.subtasks||[]},done:[...done]});if(scheduleUndo?.kind==="custom"&&scheduleUndo.todo.id===removedTodo.todo.id)scheduleUndo=null;removedTodo=null;refreshTodos();$("todo-status").textContent="已恢复待办。"};
$("date").addEventListener("change",e=>selectDate(e.target.value));
$("prev-day").onclick=()=>selectDate(shiftDate(selected,-1));
$("next-day").onclick=()=>selectDate(shiftDate(selected,1));
$("today").onclick=()=>selectDate(chinaTime().date);
$("notes").addEventListener("input",()=>updateDay({notes:$("notes").value}));
$("reminder-open").onclick=()=>{$("reminder-dialog").showModal();notificationStatus()};
$("reminder-close").onclick=()=>$("reminder-dialog").close();
function notificationStatus(){
  const supported="Notification" in window;
  const permitted=supported&&Notification.permission==="granted";
  $("enable-notifications").textContent=db.notifications&&permitted?"关闭浏览器提醒":"开启浏览器提醒";
  $("notification-status").textContent=!supported?"此浏览器不支持系统通知，可使用日历提醒。":Notification.permission==="denied"?"通知权限已被阻止。可在浏览器的网站设置中调整。":db.notifications&&permitted?"已开启：保持页面运行，到点显示通知。":"尚未开启浏览器提醒。";
}
$("enable-notifications").onclick=async()=>{
  if(!("Notification" in window)){notificationStatus();return}
  if(db.notifications&&Notification.permission==="granted"){db.notifications=false;save();notificationStatus();return}
  try{const permission=await Notification.requestPermission();db.notifications=permission==="granted";save();notificationStatus();if(db.notifications)toast("浏览器提醒已开启")}catch{toast("无法启用通知，请使用日历提醒")}
};
function download(content,name,type){
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("calendar").onclick=()=>download(calendarText(chinaTime().date),"每日努力.ics","text/calendar;charset=utf-8");
$("export").onclick=()=>download(JSON.stringify({version:1,exportedAt:new Date().toISOString(),days:db.days},null,2),`每日记录-${chinaTime().date}.json`,"application/json");
$("import").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>5_000_000)throw Error("文件过大");
    const data=JSON.parse(await file.text());
    if(data.version!==1||!data.days||Array.isArray(data.days)||typeof data.days!=="object")throw Error("格式不正确");
    const cleaned={};
    for(const [date,value] of Object.entries(data.days)){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||!value||!Array.isArray(value.done)||typeof value.notes!=="string")throw Error("记录格式不正确");
      const todos=cleanTodos(value.todos);cleaned[date]={scheduleOverrides:cleanScheduleOverrides(schedule,value.scheduleOverrides),hiddenSchedule:cleanHiddenSchedule(schedule,value.hiddenSchedule),done:[...new Set(value.done.filter(id=>schedule.some(t=>t.id===id)||todos.some(t=>t.id===id)))],notes:value.notes,todos,subtasks:cleanSubtasks(schedule,todos,value.subtasks)};
    }
    const overlap=Object.keys(cleaned).some(d=>db.days[d]);
    if(overlap&&!confirm("备份中有与当前记录相同的日期。导入会替换这些日期的打卡和笔记，是否继续？"))return;
    db.days={...db.days,...cleaned};save();renderDay();toast(`已导入 ${Object.keys(cleaned).length} 天记录`);
  }catch{toast("导入失败，请选择本网页导出的 JSON 备份文件")}finally{e.target.value=""}
});
window.addEventListener("storage",e=>{if(e.key===key){try{const updated=JSON.parse(e.newValue);if(updated?.days){db=updated;renderDay();notificationStatus()}}catch{}}});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
renderDay();tick();setInterval(tick,1000);

let paperTaskDialog=null,pendingPaperTask=null;
window.addEventListener("paper-add-to-task",e=>{
  const paper=cleanPaper(e.detail);if(!paper)return;
  pendingPaperTask={paper,date:selected};
  if(!paperTaskDialog){
    paperTaskDialog=document.createElement("dialog");paperTaskDialog.id="paper-task-dialog";
    paperTaskDialog.innerHTML=`<div class="dialog-heading"><h2>把论文加入任务</h2><button type="button" class="icon-button" aria-label="关闭加入任务">×</button></div><p id="paper-task-title" class="small"></p><p id="paper-task-date" class="small muted"></p><form id="paper-task-form"><label class="field-label" for="paper-task-target">放到哪里？</label><select id="paper-task-target"></select><p class="small muted">加入已有任务会成为不计时的子任务。单独建为待办后，可在待办清单中编辑整点／半点时间。</p><p id="paper-task-status" class="small muted" role="status"></p><button class="button primary" type="submit">确认加入</button></form>`;
    document.body.append(paperTaskDialog);paperTaskDialog.querySelector('[aria-label="关闭加入任务"]').onclick=()=>paperTaskDialog.close();
    $("paper-task-form").onsubmit=event=>{
      event.preventDefault();if(!pendingPaperTask||pendingPaperTask.date!==selected)return;
      const {paper}=pendingPaperTask,target=$("paper-task-target").value,state=day();let destination;
      if(target==="new"){
        const existing=state.todos.find(t=>t.paper?.id===paper.id);
        if(existing){$("paper-task-status").textContent="这篇论文已经是当天的待办，无需重复添加。";return}
        updateDay({todos:[...state.todos,{id:"todo-"+crypto.randomUUID(),title:paper.title.slice(0,160),start:null,end:null,detail:"论文阅读",paper}]});destination="Todo List · 待办清单";
      }else{
        const parent=[...scheduledBase(schedule,state),...state.todos].find(t=>t.id===target);if(!parent){$("paper-task-status").textContent="所属任务已发生变化，请重新选择。";return}
        const children=state.subtasks[target]||[];
        if(children.some(t=>t.paper?.id===paper.id)){$("paper-task-status").textContent="这篇论文已在该任务下面，无需重复添加。";return}
        updateDay({subtasks:{...state.subtasks,[target]:[...children,{id:"sub-"+crypto.randomUUID(),title:paper.title.slice(0,160),done:false,paper}]}});destination=parent.title;
      }
      refreshTodos();paperTaskDialog.close();toast("已加入「"+destination+"」，可在上方任务中查看。");
    };
  }
  $("paper-task-title").textContent=paper.title;$("paper-task-date").textContent="保存日期："+selected;$("paper-task-status").textContent="";
  const select=$("paper-task-target");select.replaceChildren();
  const state=day(),parents=[...scheduledBase(schedule,state),...state.todos];
  for(const task of parents){const option=document.createElement("option");option.value=task.id;option.textContent=task.title+(task.start===null?"":` · ${timeLabel(task.start)}–${timeLabel(task.end)}`);select.append(option)}
  const standalone=document.createElement("option");standalone.value="new";standalone.textContent="＋ 单独建为待办（之后可安排时间）";select.append(standalone);
  select.value=parents.some(t=>t.id==="papers")?"papers":"new";paperTaskDialog.showModal();
});

async function openLibraryPaperTask(id){
  if(typeof id!=="string"||!(/^[a-zA-Z0-9._-]{1,200}$/).test(id))return;
  try{const response=await fetch("/api/reader?id="+encodeURIComponent(id),{cache:"no-store"});if(!response.ok)throw Error();const paper=await response.json();window.dispatchEvent(new CustomEvent("paper-add-to-task",{detail:{id:paper.id,title:paper.title,url:paper.pdf}}))}catch{toast("论文暂时无法读取，请返回论文页面重试。")}
}
window.addEventListener("message",e=>{if(e.origin==="http://127.0.0.1:8769"&&e.source===window.parent&&e.data?.type==="library-paper-task")openLibraryPaperTask(e.data.paperId)});
window.addEventListener("message",e=>{if(e.origin==="http://127.0.0.1:8769"&&e.source===window.parent&&e.data?.type==="arxiv-paper-task"){selected=chinaTime().date;followToday=true;renderDay();openLibraryPaperTask(e.data.paperId)}});
const incomingParams=new URLSearchParams(location.search);if(incomingParams.get("paperToday")==="1"){selected=chinaTime().date;followToday=true;renderDay()}
const incomingPaper=incomingParams.get("addPaper");if(incomingPaper){const cleanedUrl=new URL(location.href);cleanedUrl.searchParams.delete("addPaper");cleanedUrl.searchParams.delete("paperToday");history.replaceState(null,"",cleanedUrl);openLibraryPaperTask(incomingPaper)}

function recordPaperRead(id,read){try{markPaperRead(id,read)}catch{toast("论文阅读统计保存失败，请检查浏览器存储。")}}
window.addEventListener("paper-reading-status-change",renderReadingStats);
window.addEventListener("storage",e=>{if(e.key===READING_STATE_KEY||e.key===READING_HISTORY_KEY)renderReadingStats()});
renderReadingStats();setInterval(renderReadingStats,60000);

let projectTaskDialog=null,pendingProjectTask=null;
async function openProjectTask(taskId){
 if(typeof taskId!=="string"||!(/^[a-zA-Z0-9-]{1,80}$/).test(taskId))return;
 try{const response=await fetch("http://127.0.0.1:8770/api/project-task?id="+encodeURIComponent(taskId),{cache:"no-store"});if(!response.ok)throw Error();pendingProjectTask=await response.json();
 if(!projectTaskDialog){projectTaskDialog=document.createElement("dialog");projectTaskDialog.id="project-task-dialog";projectTaskDialog.innerHTML=`<div class="dialog-heading"><h2>项目任务加入每日努力</h2><button id="project-task-close" type="button" class="icon-button" aria-label="关闭项目任务安排">×</button></div><p id="project-task-name" class="small"></p><form id="project-task-form"><label class="field-label" for="project-task-date">安排日期</label><input id="project-task-date" type="date" required><div class="todo-time-fields"><div><label class="field-label" for="project-task-start">开始时间（选填）</label><select id="project-task-start"></select></div><div><label class="field-label" for="project-task-end">结束时间（选填）</label><select id="project-task-end"></select></div></div><p class="small muted">设置时间后插入当天安排；留空则加入待办清单。</p><p id="project-task-status" class="small muted" role="status"></p><button class="button primary" type="submit">确认安排项目任务</button></form>`;document.body.append(projectTaskDialog);$("project-task-close").onclick=()=>projectTaskDialog.close();$("project-task-start").onchange=()=>{const start=timeMinutes($("project-task-start").value),end=timeMinutes($("project-task-end").value);if(start!==null&&(end===null||end<=start))fillTimeChoices("project-task-end",timeLabel(start+30))};
 $("project-task-form").onsubmit=e=>{e.preventDefault();if(!pendingProjectTask)return;const date=$("project-task-date").value,sv=$("project-task-start").value,ev=$("project-task-end").value,start=timeMinutes(sv),end=timeMinutes(ev);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||((sv||ev)&&(start===null||end===null||end<=start))){$("project-task-status").textContent="请选择有效的日期与起止时间。";return}selectDate(date);const {project,task}=pendingProjectTask;if(day().todos.some(t=>t.projectTask?.taskId===task.id)){$("project-task-status").textContent="这个任务已经加入当天，可在待办清单编辑时间。";return}updateDay({todos:[...day().todos,{id:"todo-"+crypto.randomUUID(),title:(project.name+" · "+task.title).slice(0,160),detail:task.detail||"项目基础任务",start,end,projectTask:{projectId:project.id,projectName:project.name,taskId:task.id,...(project.kind==="learning"?{kind:"learning",deckId:project.deckId}:{})}}]});refreshTodos();projectTaskDialog.close();toast("已加入 "+date+" 的"+(start===null?"待办清单":"安排"))};
 }
 projectTaskDialog.querySelector("h2").textContent=pendingProjectTask.project.kind==="learning"?"PPT 学习任务加入每日努力":"项目任务加入每日努力";$("project-task-form").querySelector("[type=submit]").textContent=pendingProjectTask.project.kind==="learning"?"确认安排学习任务":"确认安排项目任务";$("project-task-name").textContent=pendingProjectTask.project.name+" · "+pendingProjectTask.task.title;$("project-task-date").value=selected;setTimePair("project-task",null,null);$("project-task-status").textContent="";projectTaskDialog.showModal();
 }catch{toast("项目实验本暂时无法连接，请先启动本地项目网站。")}
}
window.addEventListener("message",e=>{if(e.origin==="http://127.0.0.1:8769"&&e.source===window.parent&&e.data?.type==="project-task-request")openProjectTask(e.data.taskId)});
const incomingProjectTask=new URLSearchParams(location.search).get("projectTask");if(incomingProjectTask){const cleanedUrl=new URL(location.href);cleanedUrl.searchParams.delete("projectTask");history.replaceState(null,"",cleanedUrl);openProjectTask(incomingProjectTask)}

window.addEventListener('research-practice-add',e=>{
 const task=e.detail?.task,date=e.detail?.date;if(!task||typeof task.id!=='string'||!/^research-\d{4}-\d{2}-\d{2}-[1-3]$/.test(task.id)||typeof task.title!=='string'||date!==selected)return;
 const id='todo-'+task.id;if(day().todos.some(t=>t.id===id)){if(!e.detail.quiet)toast('该科研练习已经在当天待办中。');return}
 const detail=['科研练习 · '+task.method,...(Array.isArray(task.steps)?task.steps:[]),'成果：'+(task.output||'')].join('\n');
 updateDay({todos:[...day().todos,{id,title:('科研练习 · '+task.title).slice(0,160),start:null,end:null,detail:detail.slice(0,2000)}]});refreshTodos();if(!e.detail.quiet)toast('已加入待办。点击编辑选择整点／半点，即可放入今日安排；成果在科研练习卡中记录。');
});

async function addStudyTask(paperId,taskId){
 if(typeof paperId!=='string'||!/^[a-zA-Z0-9._-]{1,200}$/.test(paperId)||typeof taskId!=='string'||!/^[a-z-]{1,60}$/.test(taskId))return;
 try{const response=await fetch('/api/study/task?paperId='+encodeURIComponent(paperId)+'&taskId='+encodeURIComponent(taskId)),task=await response.json();if(!response.ok)throw Error(task.error);selected=chinaTime().date;followToday=true;renderDay();
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(paperId+':'+taskId)),id='todo-study-'+Array.from(new Uint8Array(digest)).slice(0,16).map(n=>n.toString(16).padStart(2,'0')).join('');
 if(day().todos.some(t=>t.id===id)){toast('这项论文任务已经在今日待办中。');return}
 updateDay({todos:[...day().todos,{id,title:task.title,start:null,end:null,detail:task.detail.slice(0,2000),studyTask:{paperId,taskId}}]});refreshTodos();toast('已加入今日待办。编辑时间即可插入今日安排；完成单项不会自动标记整篇已读。');
 }catch(e){toast('添加任务失败：'+e.message)}
}
async function addPracticeTask(taskId,date){
 try{const r=await fetch('/api/research-practice?date='+encodeURIComponent(date)),plan=await r.json();if(!r.ok)throw Error(plan.error);const task=plan.tasks.find(t=>t.id===taskId);if(!task)throw Error('练习不存在');selected=date;followToday=date===chinaTime().date;renderDay();window.dispatchEvent(new CustomEvent('research-practice-add',{detail:{date,task}}))}catch(e){toast(e.message)}
}
window.addEventListener('message',e=>{if(e.origin!=='http://127.0.0.1:8769'||e.source!==parent)return;if(e.data?.type==='study-task-request')addStudyTask(e.data.paperId,e.data.taskId);if(e.data?.type==='practice-task-request')addPracticeTask(e.data.taskId,e.data.date)});
const studyParams=new URLSearchParams(location.search);if(studyParams.has('studyPaper'))addStudyTask(studyParams.get('studyPaper'),studyParams.get('studyTask'));if(studyParams.has('practiceTask'))addPracticeTask(studyParams.get('practiceTask'),studyParams.get('practiceDate'));

async function receiveReadPaper(id){if(typeof id!=='string'||!/^[a-zA-Z0-9._-]{1,200}$/.test(id))return;try{const r=await fetch('/api/reader?id='+encodeURIComponent(id));if(!r.ok)return;markPaperRead(id,true)}catch{}}
window.addEventListener('message',e=>{if(e.origin==='http://127.0.0.1:8769'&&e.source===parent&&e.data?.type==='paper-read-status')receiveReadPaper(e.data.paperId)});
const markReadParam=new URLSearchParams(location.search).get('markRead');if(markReadParam){receiveReadPaper(markReadParam);const u=new URL(location.href);u.searchParams.delete('markRead');history.replaceState(null,'',u)}
