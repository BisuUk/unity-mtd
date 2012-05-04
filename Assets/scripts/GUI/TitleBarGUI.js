#pragma strict
#pragma downcast

import CustomWidgets;

var textStyle : GUIStyle;

function OnGUI()
{
   var e : Event = Event.current;
   var scoreWidth: float = (Screen.width*20);

   GUILayout.BeginArea(Rect(Screen.width-scoreWidth, 0, scoreWidth, 60));
      GUILayout.BeginHorizontal();
            // Credits
            GUILayout.Label(GUIContent("Score:"+GameData.score.ToString(), "Score"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.isKey && e.type == EventType.KeyDown)
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






