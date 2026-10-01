import React from 'react';
import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import { Workspace } from '../../shared/Workspace';
import { demoViews, inboxLocation, shouldOpenDemoOnMount, viewName } from './navigation';
import '../../shared/styles.css';
import './host.css';

function NavLink({label,destination,icon,manager}:{label:string;destination:string;icon:string;manager:Flex.Manager}) {
  const [active,setActive]=React.useState(manager.store.getState().flex.view.activeView);
  React.useEffect(()=>manager.store.subscribe(()=>setActive(manager.store.getState().flex.view.activeView)),[manager]);
  return <Flex.SideLink icon={icon} showLabel isActive={active===destination} onClick={()=>Flex.Actions.invokeAction('NavigateToView',{viewName:destination})}>{label}</Flex.SideLink>;
}

function BrandAndDemoEntry() {
  // A mounted supported header extension runs after the host's router exists.
  // Run once: selecting Live Tasks later must not be intercepted.
  React.useEffect(()=>{
    if (shouldOpenDemoOnMount(window.location.pathname)) {
      void Flex.Actions.invokeAction('NavigateToView',{viewName:viewName('Inbox')});
    }
  },[]);
  return <span style={{color:'#dfce9d',fontWeight:600,letterSpacing:1,fontSize:13,marginLeft:16}}>BETMGM <span style={{fontWeight:400,color:'#ced3c8',fontSize:11}}>PLAYER CARE</span></span>;
}

/** Supported client UI extensions only: no tasks, SDK writes or REST mutations. */
export default class BetmgmPlugin extends FlexPlugin {
  constructor() { super('BetmgmPlugin'); }
  async init(flex: typeof Flex, manager: Flex.Manager): Promise<void> {
    manager.updateConfig({theme:{isLight:true,componentThemeOverrides:{
      MainHeader:{Container:{background:'#171b18',color:'#f4f3eb'}},
      SideNav:{Container:{background:'#171b18'},Icon:{color:'#c8b37b',background:'#171b18'},SelectedIcon:{color:'#dfce9d',background:'#34382b'}}
    }}});
    flex.ViewCollection.defaultProps.defaultLocation=inboxLocation;
    flex.MainHeader.Content.add(<BrandAndDemoEntry key="betmgm-brand"/>,{sortOrder:1});
    demoViews.forEach((view,index)=>{
      const name=viewName(view);
      flex.ViewCollection.Content.add(<flex.View name={name} key={name}><Workspace host="FLEX_HOST" view={view} onNavigate={next=>{void flex.Actions.invokeAction('NavigateToView',{viewName:viewName(next)});}}/></flex.View>);
      flex.SideNav.Content.add(<NavLink key={`betmgm-link-${view}`} label={view} destination={name} manager={manager} icon={['Agent','Tasks','DefaultAvatar','Directory','Supervisor'][index]}/>,{sortOrder:-100+index});
    });
    // Preserve the actual native desktop under a clearly separate secondary link.
    // Removing the navigation entry does not remove or replace its native view.
    flex.SideNav.Content.remove('agent-desktop');
    flex.SideNav.Content.add(<NavLink key="betmgm-live-tasks" label="Live Tasks" destination="agent-desktop" icon="Agent" manager={manager}/>,{sortOrder:100});
  }
}
