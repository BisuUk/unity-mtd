#pragma strict
#pragma downcast

import CustomWidgets;

var textStyle : GUIStyle;


private var OSM : String;
private var OSMColor : Color;
private var OSMDuration : float;
private var OSMStartTime : float;
private var OSMEndTime : float;





function OnGUI()
{
   if (Application.isLoadingLevel)
      return;
      
   //var e : Event = Event.current;
   var scoreWidth : float = (Screen.width*0.35);

   GUILayout.BeginArea(Rect(Screen.width-scoreWidth, 0, scoreWidth, 60));
      GUILayout.BeginHorizontal();
         GUILayout.FlexibleSpace();
         // Score
         GUILayout.Label(GUIContent("Score: "+Game.control.score.ToString(), "Score"), textStyle, GUILayout.MinWidth(40));

         GUILayout.Space(20);
         // Time
         var timeString : String;
         if (Game.control.roundTimeRemaining < 10)
         {
            timeString = Game.control.roundTimeRemaining.ToString("#0.0");
         }
         else
         {
            var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
            var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
            timeString = minutes.ToString("#0")+":"+seconds.ToString("#00");
         }
         GUILayout.Label(GUIContent("Time: "+timeString, "TimeLeft"), textStyle,GUILayout.MinWidth(40));

         GUILayout.Space(10);

      GUILayout.EndHorizontal();
   GUILayout.EndArea();


   GUIDoOnScreenMessage();

   // RMB de-selects
   //if (e.isKey && e.type == EventType.KeyDown)
   //{
      //switch (e.keyCode)
      //{
         //case KeyCode.Escape:
           // Game.player.selectedEmitter = null;
            //GUIControl.SwitchGUI(0);
         //break;
      //}
   //}
}

function OnSwitchGUI(id : int)
{
   enabled = (id==GUIControl.defendGUI.guiID || id==GUIControl.attackGUI.guiID);
}

private function GUIDoOnScreenMessage()
{
   if (Time.time < OSMEndTime)
   {
      textStyle.alignment = TextAnchor.MiddleCenter;
      textStyle.normal.textColor = OSMColor;
      textStyle.normal.textColor.a = Mathf.Lerp(OSMColor.a, 0, ((Time.time-OSMStartTime)/OSMDuration));
      GUI.Label(Rect(0, Screen.height/2, Screen.width, 20), OSM, textStyle);
      textStyle.alignment = TextAnchor.MiddleLeft;
      textStyle.normal.textColor = Color.white;
   }
}

function OnScreenMessage(text : String, color : Color, duration : float)
{
   OSM = text;
   OSMColor = color;
   OSMDuration = duration;
   OSMStartTime = Time.time;
   OSMEndTime = Time.time + duration;
}







