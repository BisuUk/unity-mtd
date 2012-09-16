#pragma strict

var attackUI : AttackUI;
var queuePosition : int;

var caption : UILabel;
var background : UISlicedSprite;

function OnRemove()
{
   attackUI.SendMessage("OnRemoveQueueUnit", queuePosition, SendMessageOptions.DontRequireReceiver);
}

function OnReorder()
{
   attackUI.SendMessage("OnReorderQueueUnit", queuePosition, SendMessageOptions.DontRequireReceiver);
}