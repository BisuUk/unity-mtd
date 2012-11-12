#pragma strict
#pragma downcast


var requiredColors : Color[];

private var colorsFilled : boolean[];

function Awake()
{
   colorsFilled = new boolean[requiredColors.Length];
}

function Start()
{

}

private function fillRequireColor(color : Color) : boolean
{
   var index : int = 0;
   for (var c : Color in requiredColors)
   {
      if (c == color && colorsFilled[index]==false)
      {
         colorsFilled[index]=true;
         return true;
      }
      index += 1;
   }
   return false;
}

function CheckFull()
{
   for (var b : boolean in colorsFilled)
   {
      if (b == false)
         return false;
   }
   return true;
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit && fillRequireColor(unit.actualColor))
   {
      if (CheckFull())
         Game.control.EndPuzzleRound();
   }
}
