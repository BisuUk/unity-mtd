#pragma strict

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Escape:
         GUIControl.Back();
         break;
      }
   }
}

function OnMainMenu()
{
   Application.LoadLevel("mainmenu");
}

function OnSwitchRole()
{
   Game.player.isAttacker = !Game.player.isAttacker;
   GUIControl.SwitchGUI((Game.player.isAttacker) ? 1 : 0);
}

function OnExit()
{
   Application.Quit();
}