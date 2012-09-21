#pragma strict

var attackUI : AttackUI;
var queuePosition : int;

var caption : UILabel;
var background : UISlicedSprite;
var cost : UILabel;

function OnRemove()
{
   attackUI.SendMessage("OnRemoveQueueUnit", queuePosition, SendMessageOptions.DontRequireReceiver);
}

function OnReorder()
{
   attackUI.SendMessage("OnReorderQueueUnit", queuePosition, SendMessageOptions.DontRequireReceiver);
}

function OnSelect()
{
   attackUI.SendMessage("OnClickQueueUnitButton", queuePosition, SendMessageOptions.DontRequireReceiver);
}