#pragma strict

// Hide from inspector
var emitter : Emitter;

function OnClick()
{
   UIControl.CurrentUI().SendMessage("OnPressEmitterWidget", emitter, SendMessageOptions.DontRequireReceiver);
}




