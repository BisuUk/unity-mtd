#pragma strict

var redirector : Redirector;

function Redirect()
{
   if (redirector.netView && Network.isClient)
      redirector.netView.RPC("ToServerNextState", RPCMode.Server);
   else
      redirector.NextState();
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnClickRedirector", this, SendMessageOptions.DontRequireReceiver);
}