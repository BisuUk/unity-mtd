#pragma strict

var redirector : Redirector;
var pressTween : iTweenEvent;

function Redirect()
{
   if (redirector.netView && Network.isClient)
      redirector.netView.RPC("ToServerNextState", RPCMode.Server);
   else
      redirector.NextState();
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressRedirector", this, SendMessageOptions.DontRequireReceiver);
   if (pressTween)
      pressTween.Play();
}