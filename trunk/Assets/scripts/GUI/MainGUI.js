#pragma strict

static var guiID : int = 0;

function OnGUI()
{
   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(Screen.height/2-Screen.height*0.30);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Multiplayer", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               GUIControl.SwitchGUI(1);
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Single Player", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               Game.hostType = 0;

               // Switch attacker/defender role (debugging)
               if (Game.player.isAttacker)
               {
                  // TO DEFENDER
                  Game.player.teamID = 2;
                  if (Application.loadedLevel<2)
                     Game.control.InitRound();
                  else
                  {
                     Game.player.isAttacker = (Game.player.teamID == 1);
                     GUIControl.SwitchGUI(3);
                  }
               }
               else
               {
                  // TO DEFENDER
                  Game.player.teamID = 1;
                  if (Application.loadedLevel<2)
                     Game.control.InitRound();
                  else
                  {
                     Game.player.isAttacker = (Game.player.teamID == 1);
                     GUIControl.SwitchGUI(2);
                  }
               }
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

         GUILayout.Space(20);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Exit", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               Application.Quit();
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

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

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
}

