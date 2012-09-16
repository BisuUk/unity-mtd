#pragma strict

function OnGUI()
{
   var e : Event = Event.current;
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GUIControl.Back();
         break;
      }
   }
}

function OnPressMulti()
{
   GUIControl2.SwitchGUI(1);
}

function OnPressSingle()
{
   // Coming from a network game.
   if (Network.isClient || Network.isServer)
      Network.Disconnect();

   Game.player.teamID = 1; // 1=attack or 2=defend
   Game.hostType = 0;
   Game.control.InitRound();
}

function OnPressExit()
{
   Application.Quit();
}

function OnSwitchTo()
{
   if (Game && Game.control)
   {
      Game.control.roundInProgress = false;
      Game.control.matchInProgress = false;
   }
}
