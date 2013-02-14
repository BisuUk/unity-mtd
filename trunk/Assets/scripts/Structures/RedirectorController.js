#pragma strict

var redirector : Redirector;
var pressTween : iTweenEvent;

function Redirect()
{
   redirector.NextState();
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressRedirector", this, SendMessageOptions.DontRequireReceiver);
   if (pressTween)
      pressTween.Play();
}