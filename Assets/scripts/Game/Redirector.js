#pragma strict
#pragma downcast

class RedirectorState
{
   var pathHeadNode : Transform;
   var signRotation : float;
}

var states : RedirectorState[];
var sign : Transform;
var initialState : int = 0;
var netView : NetworkView;

private var currentState : int = 0;
private var currentPath : List.<Vector3>;

function Awake()
{
   currentPath = new List.<Vector3>();
   SetState(initialState);
}

function SetState(state : int)
{
   if (states.Length==0)
   {
      currentState=0;
      return;
   }

   currentState = (state >= states.Length) ? 0 : state;

   if (Network.isServer)
      netView.RPC("ToClientSetState", RPCMode.Others, currentState);

   // Parse path for this state
   var headNode : Transform = states[currentState].pathHeadNode;
   if (headNode != null)
   {
      currentPath.Clear();
      for (var child : Transform in headNode)
         currentPath.Add(child.position);
   }

   if (sign)
   {
      var newRotation : Vector3 = sign.rotation.eulerAngles;
      newRotation.y = states[currentState].signRotation;
      //sign.rotation = Quaternion.Euler(newRotation);
      iTween.RotateTo(sign.gameObject, newRotation, 0.5);
   }
}

function OnMouseDown()
{
   if (Network.isClient)
      netView.RPC("ToServerNextState", RPCMode.Server);
   else
      SetState(currentState + 1);
}

function Redirect(unit : Unit)
{
   unit.SetPath(currentPath);
   if (Network.isServer)
      unit.netView.RPC("ClientGetPathFromRedirector", RPCMode.Others, netView.viewID, currentState);
}

function RedirectWithState(unit : Unit)
{

}

@RPC
function ToServerNextState()
{
   SetState(currentState + 1);
}

@RPC
function ToClientSetState(newState : int)
{
   SetState(newState);
}