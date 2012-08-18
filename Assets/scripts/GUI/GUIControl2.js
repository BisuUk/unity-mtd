#pragma strict
#pragma downcast

var UI : Transform[];
var logo : Transform;
var currentGUI : int = -1;
var prevGUI : int;

static var self : GUIControl2;

function Awake()
{
/*
   // No gamedata, return to main menu
   if (self)
   {
      Debug.Log("GUIControl2 exists, destroying!");
      // Destroy this, one already exists (persisted from previous scene)
      Destroy(gameObject);
      return;
   }
*/
   self = this;

   //if (Application.loadedLevelName != "mainmenu")
   //   Application.LoadLevel("mainmenu");

   // Persist through all levels
   //DontDestroyOnLoad(gameObject);
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
      Debug.Log("GUIControl2 - SwitchGUI: Error no self detected!");
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
      self.logo.gameObject.active = true;
      self.currentGUI = guiID;
      Utility.SetActiveRecursive(self.UI[self.currentGUI], true);
      self.UI[self.currentGUI].SendMessage("OnSwitchTo", SendMessageOptions.DontRequireReceiver);
   }
   else
   {
      self.logo.gameObject.active = false;
   }
}

static function SignalGUI(signal : String, guiIndex : int)
{
   if (self && guiIndex >= 0 && guiIndex < self.UI.Length)
   {
      self.UI[guiIndex].SendMessage(signal, SendMessageOptions.DontRequireReceiver);
   }
}
