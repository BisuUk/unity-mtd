#pragma strict

var controlAreaSets : Transform[];
var colorArea : Transform;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function CreateNewCursor(type : int)
{
   GUIControl.NewCursor(2, type);
}

function OnMortarTower()
{
   CreateNewCursor(3);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   CreateNewCursor(1);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
   //var c : DefendGUICursor = GUIControl.cursorObject.GetComponent(DefendGUICursor);   
}

function OnSlowTower()
{
   
}

function OnPainterTower()
{
   CreateNewCursor(2);
   SwitchControlSet(1);
   colorArea.gameObject.active = true;
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
}