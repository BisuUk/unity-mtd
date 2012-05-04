#pragma strict
#pragma downcast

import CustomWidgets;

var attackPanel : AttackGUIPanel;
var textStyle : GUIStyle;

function OnGUI()
{
   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, 0, 200, 60));
      GUILayout.Label(GUIContent(GameData.score.ToString(), "Score"), textStyle);
   GUILayout.EndArea();

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-60, 200, 60));

      GUILayout.BeginHorizontal();
            // Credits
            GUILayout.Label(GUIContent(GameData.player.credits.ToString(), "Credits"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      attackPanel.enabled = false;
      attackPanel.emitter = null;
      GameData.player.selectedEmitter = null;
      GUIControl.DestroyCursor();
   }
   else if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GameData.player.selectedEmitter = null;
            GUIControl.SwitchGUI(0);
         break;
      }
   }
}

function Update()
{

}






