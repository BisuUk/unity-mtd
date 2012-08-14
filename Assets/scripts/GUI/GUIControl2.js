#pragma strict
#pragma downcast

var UI : Transform[];
var currentGUI : int = -1;
var prevGUI : int;

static var self : GUIControl2;

function Awake()
{
   self = this;
   SwitchGUI(0);
}

static function SwitchGUI(guiID : int)
{
   GUIControl.DestroyCursor();
   SetChildrenEnabled(self.UI[self.currentGUI], false);
   //prevGUI = (guiID == mainGUI.guiID) ? mainGUI.guiID : currentGUI;

   if (guiID >= 0 && guiID < self.UI.Length)
   {
      self.currentGUI = guiID;
      SetChildrenEnabled(self.UI[self.currentGUI], true);
   }
}

static function SetChildrenEnabled(t : Transform, isEnabled : boolean)
{
   t.gameObject.active = isEnabled;
   for (var child : Transform in t)
      SetChildrenEnabled(child, isEnabled);
}