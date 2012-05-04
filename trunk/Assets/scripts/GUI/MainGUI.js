#pragma strict


function OnGUI()
{
   var e : Event = Event.current;

   if (GUI.Button (new Rect(10,10,100,30),"Standalone (A)"))
   {
      GUIControl.SwitchGUI(1);
      GameData.hostType = 0;
   }

   if (GUI.Button (new Rect(10,50,100,30),"Standalone (D)"))
   {
      GUIControl.SwitchGUI(2);
      GameData.hostType = 0;
   }

   if (GUI.Button (new Rect(10,90,100,30),"Network"))
   {
      GUIControl.SwitchGUI(3);
   }

   if (GUI.Button (new Rect(10,130,100,30),"Exit"))
   {
      Application.Quit();
   }

   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GUIControl.Resume();
         break;
      }
   }
}

