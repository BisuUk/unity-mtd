#pragma strict
import System.Collections.Generic;

// Array of squads?
var selectedSquadID : int;
var squads : Dictionary.<int,UnitSquad>;

function selectedSquad() : UnitSquad
{
   return squads[selectedSquadID];
}

function Start ()
{
   selectedSquadID = -1;
   squads = new Dictionary.<int,UnitSquad>();
}

function AddSquad(squad : UnitSquad)
{
   squad.count = 1;
   squads[squad.id] = squad;
   selectedSquadID = squad.id;
}

function RemoveSquad(squadID : int)
{
   squads.Remove(squadID);
   selectedSquadID = -1;
}

function IncrementSquad(squadID : int)
{
   squads[squadID].count += 1;
}

function DecrementSquad(squadID : int)
{
   if (squads[squadID].count > 1)
      squads[squadID].count -= 1;
}

function SetSquadColor(squadID : int, color : Color)
{
   if (squads.ContainsKey(squadID))
   {
      squads[squadID].color = color;
   }
}

function SetSquadSides(squadID : int, sides : int)
{
   if (squads.ContainsKey(squadID))
   {
      squads[squadID].sides = sides;
   }
}

function SetSquadSize(squadID : int, size : float)
{
   if (squads.ContainsKey(squadID))
   {
      squads[squadID].size = size;
   }
}

function Update ()
{

}