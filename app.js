const LOC=["舞洲","西淀","住之江","東淀","平野","八尾"];
const TYPES=LOC.flatMap(x=>[x+"・昼",x+"・夜"]);

const data={
 accounts:[["tanaka","田中","個人"],["sato","佐藤","個人"],["suzuki","鈴木","個人"],["mall","商業施設","共有"]],
 inventory:{
  tanaka:[3,2,5,1,2,1,0,2,4,1,1,0],
  sato:[2,1,1,3,4,1,3,0,2,2,0,1],
  suzuki:[5,2,2,2,1,0,2,4,3,1,4,2],
  mall:[8,6,6,5,3,4,7,8,2,3,5,6]
 },
 history:{tanaka:[],mall:[]},
 devices:[
  ["田中","田中 会社iPad"],["田中","田中 個人スマホ"],
  ["佐藤","佐藤 会社iPad"],["佐藤","佐藤 個人スマホ"],
  ["鈴木","鈴木 会社iPad"],["鈴木","鈴木 個人スマホ"],
  ["商業施設","商業施設 スマホA"],["商業施設","商業施設 スマホB"],
  ["商業施設","商業施設 スマホC"],["商業施設","商業施設 スマホD"]
 ]
};

let account=null,device=null,pendingQuickType=null;

/*
  期間ルール
  前半: 毎月1日09:00 〜 16日08:59:59
  後半: 毎月16日09:00 〜 翌月1日08:59:59

  つまり:
  - 1日 00:00〜08:59 は「前月の後半」
  - 16日 00:00〜08:59 は「当月の前半」
*/
function getPeriodInfo(now=new Date()){
  const y=now.getFullYear();
  const m=now.getMonth();
  const d=now.getDate();
  const h=now.getHours();

  if(d===1 && h<9){
    const prevMonthStart=new Date(y,m-1,16,9,0,0,0);
    const end=new Date(y,m,1,8,59,59,999);
    return {half:"後半", start:prevMonthStart, end, key:formatPeriodKey(prevMonthStart)};
  }

  if(d<16 || (d===16 && h<9)){
    const start=new Date(y,m,1,9,0,0,0);
    const end=new Date(y,m,16,8,59,59,999);
    return {half:"前半", start, end, key:formatPeriodKey(start)};
  }

  const start=new Date(y,m,16,9,0,0,0);
  const end=new Date(y,m+1,1,8,59,59,999);
  return {half:"後半", start, end, key:formatPeriodKey(start)};
}

function formatPeriodKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}-0900`;
}
function fmtMDHM(d){
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function periodLabel(){
  const p=getPeriodInfo();
  return `${p.half}（${fmtMDHM(p.start)}〜${fmtMDHM(p.end)}）`;
}
function nowLabel(){
  const d=new Date();
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

document.getElementById("headerSub").textContent=nowLabel()+" ・ "+periodLabel();

function start(mode){
 document.getElementById("gate").classList.add("hidden");
 document.getElementById("app").classList.remove("hidden");
 document.getElementById("periodText").textContent="現在期間："+periodLabel();

 if(mode==="admin"){
   document.getElementById("who").textContent="事務所 管理者";
   document.getElementById("device").textContent="事務所PC";
   renderAdmin(); return;
 }

 account=mode.startsWith("tanaka")?"tanaka":"mall";
 device=mode==="tanaka-ipad"?"田中 会社iPad":
        mode==="tanaka-phone"?"田中 個人スマホ":
        mode==="mall-a"?"商業施設 スマホA":"商業施設 スマホB";

 document.getElementById("who").textContent=account==="tanaka"?"田中":"商業施設";
 document.getElementById("device").textContent=device;
 renderEmployee();
}

function renderEmployee(){
 document.getElementById("employee").classList.remove("hidden");
 document.getElementById("admin").classList.add("hidden");
 const inv=data.inventory[account];

 document.getElementById("inventory").innerHTML=LOC.map((l,i)=>`
  <div class="loc">
    <div class="locname">${l}</div>
    <div class="daynight">
      <button class="ticket" onclick="openQuickUse('${l}・昼')">
        <div class="label">昼</div>
        <div class="count ${inv[i*2]===0?"zero":""}">${inv[i*2]} 枚</div>
      </button>
      <button class="ticket" onclick="openQuickUse('${l}・夜')">
        <div class="label">夜</div>
        <div class="count ${inv[i*2+1]===0?"zero":""}">${inv[i*2+1]} 枚</div>
      </button>
    </div>
  </div>
 `).join("");

 const h=data.history[account]||[];
 document.getElementById("history").innerHTML=h.length
  ?h.map(x=>`<div style="padding:8px 0;border-bottom:1px solid #eee">
      <b>${x.type} ${x.qty}枚</b>
      <div class="small">${x.date} ・ ${x.device}</div>
    </div>`).join("")
  :'<div class="small" style="padding:12px 0">まだ履歴なし</div>';
}

/* 従来の「券を使用」ボタンは残す。複数枚にも対応 */
function useTicket(){
 const type=prompt("券種を入力\n"+TYPES.join(" / "));
 if(!TYPES.includes(type))return;
 const qty=Number(prompt("枚数",1));
 if(!qty||qty<1)return;
 consume(type,qty);
}

/* 昼/夜の表示を直接タップ → 1枚使用確認 */
function openQuickUse(type){
 const idx=TYPES.indexOf(type);
 if(data.inventory[account][idx]===0){
   alert(type+"の在庫は0枚です");
   return;
 }
 pendingQuickType=type;
 document.getElementById("confirmDate").textContent=nowLabel();
 document.getElementById("confirmTitle").textContent=type+"を使用しますか？";
 document.getElementById("confirmModal").classList.remove("hidden");
}

function closeConfirm(){
 pendingQuickType=null;
 document.getElementById("confirmModal").classList.add("hidden");
}
function modalBackdrop(e){
 if(e.target.id==="confirmModal")closeConfirm();
}
function confirmQuickUse(){
 if(!pendingQuickType)return;
 const type=pendingQuickType;
 closeConfirm();
 consume(type,1);
}
function consume(type,qty){
 const i=TYPES.indexOf(type);
 if(data.inventory[account][i]<qty){
   alert("在庫不足");
   return;
 }
 data.inventory[account][i]-=qty;
 (data.history[account]??=[]).unshift({
   type,qty,device,
   date:nowLabel(),
   period:getPeriodInfo().key
 });
 renderEmployee();
}

/* 管理者デモ */
function renderAdmin(){
 document.getElementById("admin").classList.remove("hidden");
 document.getElementById("employee").classList.add("hidden");
 renderOverview();renderDistribution();renderDevices();
}
function header(){
 return LOC.map(l=>`<th>${l}<br>昼</th><th>${l}<br>夜</th>`).join("");
}
function renderOverview(){
 document.getElementById("overviewTable").innerHTML=
  "<tr><th>対象</th>"+header()+"</tr>"+
  data.accounts.map(a=>
    "<tr><td>"+a[1]+(a[2]==="共有"?"（共有）":"")+"</td>"+
    data.inventory[a[0]].map(n=>`<td class="${n===0?"zero":""}">${n}</td>`).join("")+
    "</tr>"
  ).join("");
}
function renderDistribution(){
 document.getElementById("distributionTable").innerHTML=
  "<tr><th>対象</th>"+header()+"</tr>"+
  data.accounts.map(a=>
    "<tr><td>"+a[1]+"</td>"+
    TYPES.map((_,i)=>`<td><input style="width:48px" type="number" min="0" value="0" data-a="${a[0]}" data-i="${i}"></td>`).join("")+
    "</tr>"
  ).join("");
}
function commitDistribution(){
 document.querySelectorAll("#distributionTable input").forEach(el=>{
   const q=Number(el.value)||0;
   if(q>0)data.inventory[el.dataset.a][Number(el.dataset.i)]+=q;
   el.value=0;
 });
 renderOverview();
 alert("デモ：一括配券を反映しました");
}
function renderDevices(){
 document.getElementById("deviceList").innerHTML=
  data.devices.map(d=>`<div style="padding:10px;border-bottom:1px solid #eee"><b>${d[0]}</b><div class="small">${d[1]}</div></div>`).join("");
}
function showTab(t){
 ["overview","distribute","adjust","devices"].forEach(x=>{
   document.getElementById(x).classList.toggle("hidden",x!==t);
   document.getElementById("t-"+x).classList.toggle("active",x===t);
 });
}
