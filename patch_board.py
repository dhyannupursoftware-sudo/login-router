# import sys

# path = r'C:\login-router\login page\src\components\todo\TodoWorkspace.tsx'
# with open(path, 'r', encoding='utf-8') as f:
#     text = f.read()

# # Add import
# import_stmt = 'import PremiumBoardView from "./PremiumBoardView";\nimport SectionCard'
# text = text.replace('import SectionCard', import_stmt)

# # Extract parts
# start_idx = text.find('{activeMode === "board" && (')
# end_idx = text.find('{activeMode === "timeline" && (')

# if start_idx != -1 and end_idx != -1:
#     before = text[:start_idx]
    
#     # Locate the closing `)}` just before the timeline block
#     timeline_block = text[end_idx:]
    
#     # We want to insert our new block exactly where `activeMode === "board"` started.
#     # The end of board block is precisely before the whitespace leading to timeline block.
#     # We can just look backwards from end_idx for the closing `)}`.
    
#     # But since we just drop the whole text[start_idx:end_idx] and find the exact closing bracket,
#     # actually wait, `text[start_idx:end_idx]` contains the entire board block including its `)}`.
#     # BUT there might be whitespace before `timeline`. 
#     # To be perfectly safe, let's just find the last `)}` before end_idx.
    
#     last_closing = text.rfind(')}', start_idx, end_idx)
#     if last_closing != -1:
#         # We replace from start_idx to last_closing + 2
#         new_board_block = '''{activeMode === "board" && (
#                 <PremiumBoardView 
#                   tasks={todos} 
#                   onToggleDone={(taskId) => dispatch({ type: "TOGGLE", payload: taskId })}
#                 #   onDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setDeleteTarget(task); }} 
#                   onOpenAddModal={openAddTaskModal} 
#                 />
#               )}'''
        
#         new_text = text[:start_idx] + new_board_block + text[last_closing + 2:]
#         with open(path, 'w', encoding='utf-8') as f:
#             f.write(new_text)
#         print('Successfully Replaced Board Mode!')
#     else:
#         print('Could not find closing bracket.')
# else:
#     print(f'Start: {start_idx}, End: {end_idx}')
