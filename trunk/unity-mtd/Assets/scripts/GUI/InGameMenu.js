#pragma strict

static var uiIndex : int = 2;

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Escape:
         UIControl.Back();
         break;
      }
   }
}

function OnMainMenu()
{
   Application.LoadLevel("mainmenu");
   Time.timeScale = 1.0;
}

function OnSwitchRole()
{
   Game.player.isAttacker = !Game.player.isAttacker;
   UIControl.SwitchUI((Game.player.isAttacker) ? 1 : 0);
}

function OnRetryLevel()
{
   Game.control.nextLevel = Application.loadedLevelName;
   Game.control.InitLevel(GameModeType.GAMEMODE_PUZZLE, Application.loadedLevelName);
}

function OnExit()
{
   Application.Quit();
}