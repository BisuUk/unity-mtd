#pragma strict


function CreateNewCursor(type : int)
{
   GUIControl.NewCursor(2, type);
}

function OnMortarTower()
{
   CreateNewCursor(3);
}

function OnRangedTower()
{
   CreateNewCursor(1);
}

function OnSlowTower()
{
   
}

function OnPainterTower()
{
   CreateNewCursor(2);
}