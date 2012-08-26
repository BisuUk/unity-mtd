#pragma strict
#pragma downcast

var UI : Transform[];

var currentGUI : int = -1;
var prevGUI : int;

static var self : GUIControlInGame;

function Awake()
{
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

   GUIControl.DestroyCursor();
   if (self.currentGUI >= 0 && self.currentGUI < self.UI.Length)
   {
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
