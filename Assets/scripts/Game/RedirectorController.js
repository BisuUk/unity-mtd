#pragma strict

var redirector : Redirector;

function OnMouseDown()
{
   if (redirector.netView && Network.isClient)
      redirector.netView.RPC("ToServerNextState", RPCMode.Server);
   else
      redirector.NextState();
}