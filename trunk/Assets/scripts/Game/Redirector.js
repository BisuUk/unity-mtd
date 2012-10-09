#pragma strict
#pragma downcast

class RedirectorState
{
   var pathHeadNode : Transform;
   var signRotation : float;
}

var states : RedirectorState[];
var sign : Transform;
private var currentState = 0;
private var currentPath : List.<Vector3>;

function Awake()
{
   currentPath = new List.<Vector3>();
   SetState(0);
}

function SetState(state : int)
{
   if (states.Length==0)
   {
      currentState=0;
      return;
   }

   currentState = (state >= states.Length) ? 0 : state;

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
      sign.rotation = Quaternion.Euler(sign.rotation.eulerAngles.x, states[currentState].signRotation, sign.rotation.eulerAngles.z);
   }
}

function OnMouseDown()
{
   SetState(currentState + 1);
}

function Redirect(unit : Unit)
{
   if (!Network.isClient)
   {
      unit.SetPath(currentPath);
   }
}