#pragma strict
#pragma downcast

import CustomWidgets;

var attackPanel : AttackGUIPanel;
var textStyle : GUIStyle;

static var guiID : int = 2;

function OnGUI()
{
   if (Application.isLoadingLevel)
      return;

   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-60, 200, 60));
      GUILayout.BeginHorizontal();
            // Credits
            GUILayout.Label(GUIContent(Game.player.credits.ToString(), "Credits"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      attackPanel.enabled = false;
      attackPanel.emitter = null;
      Game.player.selectedEmitter = null;
      GUIControl.DestroyCursor();
   }
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
   if (id!=guiID)
      attackPanel.enabled = false;
}





