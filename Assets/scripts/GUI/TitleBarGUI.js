#pragma strict
#pragma downcast

import CustomWidgets;

var textStyle : GUIStyle;

function OnGUI()
{
   var e : Event = Event.current;
   var scoreWidth : float = (Screen.width*0.30);

   GUILayout.BeginArea(Rect(Screen.width-scoreWidth, 0, scoreWidth, 60));
      GUILayout.BeginHorizontal();
         // Score
         GUILayout.Label(GUIContent("Score: "+Game.control.score.ToString(), "Score"), textStyle);

         // Time
         GUILayout.Label(GUIContent("Time: "+Game.control.roundTimeRemaining.ToString("#0"), "TimeLeft"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            Game.player.selectedEmitter = null;
            GUIControl.SwitchGUI(0);
         break;
      }
   }
}

function Update()
{

}






