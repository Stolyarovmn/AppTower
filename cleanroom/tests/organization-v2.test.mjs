import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,reduce,validate} from '../core/model.js';

test('add current opens only an empty workspace',()=>{
 let d=reduce(defaults(),{type:'add',openIfEmpty:true,item:{url:'http://a.test'}});
 assert.equal(d.workspaces[0].panes.top.url,'http://a.test/');
 d=reduce(d,{type:'add',openIfEmpty:true,item:{url:'https://b.test'}});
 assert.equal(d.workspaces[0].panes.top.url,'http://a.test/');assert.equal(d.workspaces[0].items.length,2);
});
test('template order controls pane opening and group color survives persistence',()=>{
 let d=defaults();for(const id of ['a','b'])d=reduce(d,{type:'add',item:{id,url:`https://${id}.test`}});
 const template=reduce(d,{type:'combine',id:'a',targetId:'b',kind:'template',reverse:true});
 const t=template.workspaces[0].items[0];assert.equal(t.top.id,'b');
 const opened=reduce(template,{type:'open-item',id:t.id});assert.equal(opened.workspaces[0].panes.top.url,'https://b.test/');
 const group=reduce(d,{type:'combine',id:'a',targetId:'b',kind:'group',name:'Работа',color:'#ffcc00'});
 assert.equal(validate(group).workspaces[0].items[0].color,'#ffcc00');
 assert.equal(validate({...group,settings:{}}).settings.backgroundLimit,12);
});

test('workspace ordering preserves identities and pane data',()=>{let d=reduce(defaults(),{type:'workspace-add',name:'Second'});const first=d.workspaces[0].id,second=d.workspaces[1].id;d=reduce(d,{type:'workspace-move',workspaceId:second,direction:-1});assert.deepEqual(d.workspaces.map(w=>w.id),[second,first]);});
