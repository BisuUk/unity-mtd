#pragma strict
#pragma downcast

var UI : Transform[];

var currentUI : int = -1;
var prevUI : int;
var onScreenMessage : UILabel;

static var self : UIControl;

function Awake()
{
   // No gamedata, return to main menu
   if (!Game.self)
   {
      Debug.Log("GameData not found, returning to mainmenu!");
      if (Application.loadedLevelName != "mainmenu")
      {
         Application.LoadLevel("mainmenu");
         return;
      }
   }

   self = this;
}

function Start()
{
   // Disable all UIs to start
   for (var ui : Transform in UI)
      Utility.SetActiveRecursiveForce(ui, false);

   // Switch to main UI
   SwitchUI(0);
}

static function SwitchUI(guiID : int)
{
   if (!self)
   {
      Debug.Log("GUIControlInGame - SwitchGUI: Error no self detected!");
      return;
   }

   if (self.currentUI >= 0 && self.currentUI < self.UI.Length)
   {
      self.prevUI = self.currentUI;
      self.UI[self.currentUI].SendMessage("OnSwitchFrom", SendMessageOptions.DontRequireReceiver);
      Utility.SetActiveRecursive(self.UI[self.currentUI], false);
   }

   if (guiID >= 0 && guiID < self.UI.Length)
   {
      self.currentUI = guiID;
      Utility.SetActiveRecursive(self.UI[self.currentUI], true);
      self.UI[self.currentUI].SendMessage("OnSwitchTo", SendMessageOptions.DontRequireReceiver);
   }
}

static function GetUI(index : int)
{
   if (self && index >= 0 && index < self.UI.Length)
   {
      return self.UI[index];
   }
}

static function OnScreenMessage(message : String, color : Color, duration : float)
{
   if (self && self.onScreenMessage)
   {
      self.onScreenMessage.text = message;
      self.onScreenMessage.color = color;
      Utility.SetActiveRecursive(self.onScreenMessage.transform, true);

      var tween : TweenColor = self.onScreenMessage.GetComponent(TweenColor);
      var c : Color = color;
      c.a = 0.0;
      tween.Begin(self.onScreenMessage.gameObject, duration, c);
   }
}

static function Back()
{
   if (self)
      self.SwitchUI(self.prevUI);
}
