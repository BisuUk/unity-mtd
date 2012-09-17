#pragma strict
#pragma downcast

var UI : Transform[];

var currentGUI : int = -1;
var prevGUI : int;
var onScreenMessage : UILabel;

static var self : GUIControl;

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
   SwitchGUI(0);
}

static function SwitchGUI(guiID : int)
{
   if (!self)
   {
      Debug.Log("GUIControlInGame - SwitchGUI: Error no self detected!");
      return;
   }

   if (self.currentGUI >= 0 && self.currentGUI < self.UI.Length)
   {
      self.prevGUI = self.currentGUI;
      self.UI[self.currentGUI].SendMessage("OnSwitchFrom", SendMessageOptions.DontRequireReceiver);
      Utility.SetActiveRecursive(self.UI[self.currentGUI], false);
   }

   if (guiID >= 0 && guiID < self.UI.Length)
   {
      self.currentGUI = guiID;
      Utility.SetActiveRecursive(self.UI[self.currentGUI], true);
      self.UI[self.currentGUI].SendMessage("OnSwitchTo", SendMessageOptions.DontRequireReceiver);
   }
}

static function SignalGUI(guiIndex : int, signal : String)
{
   if (self && guiIndex >= 0 && guiIndex < self.UI.Length)
   {
      self.UI[guiIndex].SendMessage(signal, SendMessageOptions.DontRequireReceiver);
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
      self.SwitchGUI(self.prevGUI);
}
